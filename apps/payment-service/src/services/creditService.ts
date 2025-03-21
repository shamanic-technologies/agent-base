/**
 * Credit service for managing customer credits
 */
import { stripe } from '../config';
import { TransactionData } from '../types';
import { calculateCustomerCredits } from './customerService';
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
  
  return { 
    transaction: balanceTransaction,
    newBalance
  };
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