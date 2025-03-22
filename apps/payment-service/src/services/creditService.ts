/**
 * Credit service for managing customer credits
 */
import { stripe } from '../config';
import { TransactionData } from '../types';
import { calculateCustomerCredits, getAutoRechargeSettings } from './customerService';
import Stripe from 'stripe';

/**
 * Check if a customer has enough credit for a requested amount
 */
export async function hasEnoughCredit(customerId: string, amount: number): Promise<boolean> {
  const credits = await calculateCustomerCredits(customerId);
  return credits.remaining >= amount;
}

/**
 * Add credit to a customer's balance
 */
export async function addCredit(
  customerId: string, 
  amount: number, 
  description: string = 'Added credit'
): Promise<{ transaction: Stripe.CustomerBalanceTransaction, newBalance: number }> {
  // Get existing balance first
  const existingCredits = await calculateCustomerCredits(customerId);
  
  // Create a negative balance transaction to add credit
  const balanceTransaction = await stripe.customers.createBalanceTransaction(customerId, {
    amount: Math.round(amount * -100), // Convert to cents (negative for credit)
    currency: 'usd',
    description
  });
  
  // Calculate new balance after adding credit
  const newTotalCredits = existingCredits.total + amount;
  const newBalance = newTotalCredits - existingCredits.used;
  
  console.log(`Credit calculation after adding ${amount}:`, {
    previousTotalCredits: existingCredits.total,
    newTotalCredits,
    usedCredits: existingCredits.used,
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
  customerId: string, 
  amount: number, 
  description: string = 'API usage'
): Promise<{ transaction: Stripe.CustomerBalanceTransaction, newBalance: number }> {
  // Get existing balance first
  const existingCredits = await calculateCustomerCredits(customerId);
  
  // Check if customer has enough credit
  if (existingCredits.remaining < amount) {
    throw new Error(`Insufficient credit: ${existingCredits.remaining} available, ${amount} requested`);
  }
  
  // Create a positive balance transaction to deduct credit
  const balanceTransaction = await stripe.customers.createBalanceTransaction(customerId, {
    amount: Math.round(amount * 100), // Convert to cents (positive for deduction)
    currency: 'usd',
    description
  });
  
  // Calculate new balance after deduction
  const newUsedCredits = existingCredits.used + amount;
  const newBalance = existingCredits.total - newUsedCredits;
  
  // Check if auto-recharge should be triggered
  await checkAndTriggerAutoRecharge(customerId, newBalance);
  
  return { 
    transaction: balanceTransaction,
    newBalance
  };
}

/**
 * Check if auto-recharge should be triggered and process it if needed
 */
export async function checkAndTriggerAutoRecharge(
  customerId: string, 
  currentBalance: number
): Promise<boolean> {
  try {
    // Get auto-recharge settings
    const settings = await getAutoRechargeSettings(customerId);
    
    // If not enabled or settings not found, do nothing
    if (!settings || !settings.enabled) {
      return false;
    }
    
    // Check if balance is below threshold
    if (currentBalance <= settings.thresholdAmount) {
      console.log(`Auto-recharge triggered for customer ${customerId}. Balance: $${currentBalance.toFixed(2)}, Threshold: $${settings.thresholdAmount.toFixed(2)}`);
      
      // Get customer to find payment methods
      const customer = await stripe.customers.retrieve(customerId, {
        expand: ['default_source']
      });
      
      if ('deleted' in customer) {
        console.error(`Cannot process auto-recharge: Customer ${customerId} has been deleted`);
        return false;
      }
      
      // Check if customer has a default payment method
      if (!customer.default_source && !customer.invoice_settings?.default_payment_method) {
        console.error(`Cannot process auto-recharge: No default payment method for customer ${customerId}`);
        return false;
      }
      
      // Create payment intent for recharge amount
      const paymentMethodId = 
        typeof customer.invoice_settings?.default_payment_method === 'string' 
          ? customer.invoice_settings.default_payment_method
          : customer.default_source as string;
      
      // Create payment intent & confirm immediately (off-session)
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(settings.rechargeAmount * 100), // Convert to cents
        currency: 'usd',
        customer: customerId,
        payment_method: paymentMethodId,
        off_session: true,
        confirm: true,
        description: 'Automatic recharge'
      });
      
      if (paymentIntent.status === 'succeeded') {
        // Add credits to customer balance
        await addCredit(
          customerId, 
          settings.rechargeAmount, 
          'Automatic recharge'
        );
        
        console.log(`Auto-recharge successful for customer ${customerId}. Added $${settings.rechargeAmount.toFixed(2)}`);
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
  customerId: string, 
  limit: number = 100
): Promise<TransactionData[]> {
  const transactions = await stripe.customers.listBalanceTransactions(
    customerId,
    { limit }
  );
  
  return transactions.data.map(tx => {
    // Determine if this is a credit (negative amount) or debit (positive amount)
    const type = tx.amount < 0 ? 'credit' : 'debit';
    const amount = Math.abs(tx.amount) / 100; // Convert from cents and make positive
    
    return {
      id: tx.id,
      customerId,
      userId: '', // Will be filled by the controller using the customer metadata
      type,
      amount,
      description: tx.description || '',
      timestamp: new Date(tx.created * 1000)
    };
  });
}

/**
 * Process a payment using Stripe payment intents
 */
export async function processPayment(
  customerId: string, 
  amount: number, 
  paymentMethodId: string, 
  description: string = 'Add credit to account'
): Promise<Stripe.PaymentIntent> {
  return await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency: 'usd',
    customer: customerId,
    payment_method: paymentMethodId,
    confirm: true,
    description
  });
} 