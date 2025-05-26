/**
 * Credit service for managing customer credits
 */
import { stripe } from '../config/index.js';
import { AgentBaseCustomerCredits, AgentBaseDeductCreditRequest, AgentBaseStripeTransaction } from '@agent-base/types';
import { calculateCustomerCredits, getAutoRechargeSettings } from './customerService.js';
import Stripe from 'stripe';

/**
 * Check if a customer has enough credit for a requested amount
 */
export async function hasEnoughCredit(stripeCustomerId: string, amountInUSDCents: number): Promise<boolean> {
  const customerCredits = await calculateCustomerCredits(stripeCustomerId);
  return customerCredits.remainingInUSDCents >= amountInUSDCents;
}

/**
 * Add credit to a customer's balance
 */
export async function addCredit(
  stripeCustomerId: string, 
  amountInUSDCents: number, 
  description: string = 'Added credit'
): Promise<{ transaction: Stripe.CustomerBalanceTransaction, newBalance: number }> {
  // Get existing balance first
  console.log(`[creditService.addCredit] About to call calculateCustomerCredits for customer ${stripeCustomerId} (from within addCredit)`);
  const existingCredits: AgentBaseCustomerCredits = await calculateCustomerCredits(stripeCustomerId);
  console.log(`[creditService.addCredit] Finished calculateCustomerCredits for customer ${stripeCustomerId} (from within addCredit)`);
  
  // Create a negative balance transaction to add credit
  console.log(`[creditService.addCredit] About to call stripe.customers.createBalanceTransaction for customer ${stripeCustomerId}`);
  const balanceTransaction = await stripe.customers.createBalanceTransaction(stripeCustomerId, {
    amount: Math.round(amountInUSDCents * -1), // negative for credit
    currency: 'usd',
    description
  });
  console.log(`[creditService.addCredit] Finished stripe.customers.createBalanceTransaction for customer ${stripeCustomerId}`);
  
  // Calculate new balance after adding credit
  const newTotalCredits = existingCredits.totalInUSDCents + amountInUSDCents;
  const newBalance = newTotalCredits - existingCredits.usedInUSDCents;
  
  console.log(`Credit calculation after adding ${amountInUSDCents}:`, {
    previousTotalCredits: existingCredits.totalInUSDCents,
    newTotalCredits,
    usedCredits: existingCredits.usedInUSDCents,
    newBalance
  });
  
  return { 
    transaction: balanceTransaction,
    newBalance
  };
}

/**
 * Deduct credit from a customer's balance
 */
export async function deductCredit(
  stripeCustomerId: string, 
  amountInUSDCents: number, 
  description: string = 'API usage'
): Promise<number> {
  try {
    // Get existing balance first
    console.log(`[creditService.deductCredit] About to call calculateCustomerCredits for customer ${stripeCustomerId}`);
    const existingCredits = await calculateCustomerCredits(stripeCustomerId);
    console.log(`[creditService.deductCredit] Finished calculateCustomerCredits for customer ${stripeCustomerId}`);
    
    // Create a positive balance transaction to deduct credit
    console.log(`[creditService.deductCredit] About to call stripe.customers.createBalanceTransaction for customer ${stripeCustomerId}, amount: ${amountInUSDCents}`);
    await stripe.customers.createBalanceTransaction(stripeCustomerId, {
      amount: Math.round(amountInUSDCents), // positive for deduction
      currency: 'usd',
      description
    });
    console.log(`[creditService.deductCredit] Finished stripe.customers.createBalanceTransaction for customer ${stripeCustomerId}`);
    
    // Calculate new balance after deduction
    const newUsedCreditsInUSDCents = existingCredits.usedInUSDCents + amountInUSDCents;
    const newBalanceInUSDCents = existingCredits.totalInUSDCents - newUsedCreditsInUSDCents;
      
    // Check if auto-recharge should be triggered
    await checkAndTriggerAutoRecharge(stripeCustomerId, newBalanceInUSDCents);
    
    return newBalanceInUSDCents;

  } catch (error) {
    console.error('Error deducting credit:', error);
    throw error;
  }
}

/**
 * Check if auto-recharge should be triggered and process it if needed
 */
export async function checkAndTriggerAutoRecharge(
  stripeCustomerId: string, 
  currentBalanceInUSDCents: number
): Promise<boolean> {
  try {
    // Get auto-recharge settings
    const settings = await getAutoRechargeSettings(stripeCustomerId);
    
    // If not enabled or settings not found, do nothing
    if (!settings || !settings.enabled) {
      return false;
    }
    
    // Check if balance is below threshold
    if (currentBalanceInUSDCents <= settings.thresholdAmountInUSDCents) {
      console.log(`Auto-recharge triggered for customer ${stripeCustomerId}. Balance: $${(currentBalanceInUSDCents/100).toFixed(2)}, Threshold: $${(settings.thresholdAmountInUSDCents/100).toFixed(2)}`);
      
      // Get customer to find payment methods
      console.log(`[creditService.checkAndTriggerAutoRecharge] About to call stripe.customers.retrieve for customer ${stripeCustomerId}`);
      const customer = await stripe.customers.retrieve(stripeCustomerId, {
        expand: ['default_source']
      });
      console.log(`[creditService.checkAndTriggerAutoRecharge] Finished stripe.customers.retrieve for customer ${stripeCustomerId}`);
      
      if ('deleted' in customer) {
        console.error(`Cannot process auto-recharge: Customer ${stripeCustomerId} has been deleted`);
        return false;
      }
      
      // Check if customer has a default payment method
      if (!customer.default_source && !customer.invoice_settings?.default_payment_method) {
        console.error(`Cannot process auto-recharge: No default payment method for customer ${stripeCustomerId}`);
        return false;
      }
      
      // Create payment intent for recharge amount
      const paymentMethodId = 
        typeof customer.invoice_settings?.default_payment_method === 'string' 
          ? customer.invoice_settings.default_payment_method
          : customer.default_source as string;
      
      // Create payment intent & confirm immediately (off-session)
      console.log(`[creditService.checkAndTriggerAutoRecharge] About to call stripe.paymentIntents.create for customer ${stripeCustomerId}`);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(settings.rechargeAmountInUSDCents),
        currency: 'usd',
        customer: stripeCustomerId,
        payment_method: paymentMethodId,
        off_session: true,
        confirm: true,
        description: 'Automatic recharge'
      });
      console.log(`[creditService.checkAndTriggerAutoRecharge] Finished stripe.paymentIntents.create for customer ${stripeCustomerId}. Status: ${paymentIntent.status}`);
      
      if (paymentIntent.status === 'succeeded') {
        // Add credits to customer balance
        await addCredit(
          stripeCustomerId, 
          settings.rechargeAmountInUSDCents, 
          'Automatic recharge'
        );
        
        console.log(`Auto-recharge successful for customer ${stripeCustomerId}. Added $${(settings.rechargeAmountInUSDCents/100).toFixed(2)}`);
        return true;
      } else {
        console.error(`Auto-recharge payment failed: ${paymentIntent.status}`);
        return false;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error during auto-recharge process:', error);
    return false;
  }
}

/**
 * Get customer transaction history
 */
export async function getTransactionHistory(
  stripeCustomerId: string, 
  limit: number = 100
): Promise<Stripe.CustomerBalanceTransaction[]> {
  console.log(`[creditService.getTransactionHistory] About to call stripe.customers.listBalanceTransactions for customer ${stripeCustomerId}`);
  const transactions = await stripe.customers.listBalanceTransactions(
    stripeCustomerId,
    { limit }
  );
  console.log(`[creditService.getTransactionHistory] Finished stripe.customers.listBalanceTransactions for customer ${stripeCustomerId}. Count: ${transactions.data.length}`);
  if (transactions) {
    return transactions.data;
  }
  return [];
}

/**
 * Process a payment using Stripe payment intents
 */
export async function processPayment(
  stripeCustomerId: string, 
  amountInUSDCents: number, 
  paymentMethodId: string, 
  description: string = 'Add credit to account'
): Promise<Stripe.PaymentIntent> {
  console.log(`[creditService.processPayment] About to call stripe.paymentIntents.create for customer ${stripeCustomerId}`);
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amountInUSDCents), // Convert to cents
    currency: 'usd',
    customer: stripeCustomerId,
    payment_method: paymentMethodId,
    confirm: true,
    description
  });
  console.log(`[creditService.processPayment] Finished stripe.paymentIntents.create for customer ${stripeCustomerId}. Status: ${paymentIntent.status}`);
  return paymentIntent;
} 