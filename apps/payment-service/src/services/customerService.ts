/**
 * Customer service for managing Stripe customers
 */
import { stripe } from '../config';
import { CustomerData, CustomerCredits } from '../types';
import Stripe from 'stripe';

/**
 * Find a customer by user ID
 */
export async function findCustomerByUserId(userId: string): Promise<Stripe.Customer | null> {
  const customers = await stripe.customers.search({
    query: `metadata['userId']:'${userId}'`,
    limit: 1
  });
  
  return customers.data.length > 0 ? customers.data[0] : null;
}

/**
 * Create a new customer in Stripe
 */
export async function createCustomer(userId: string, email?: string, name?: string): Promise<Stripe.Customer> {
  const customerParams: Stripe.CustomerCreateParams = {
    metadata: {
      userId: userId
    }
  };
  
  // Add email and name if available
  if (email) customerParams.email = email;
  if (name) customerParams.name = name;
  
  console.log(`Creating new customer with params:`, customerParams);
  return await stripe.customers.create(customerParams);
}

/**
 * Add free sign-up credit to a new customer
 */
export async function addFreeSignupCredit(customerId: string, amount: number = 5): Promise<Stripe.CustomerBalanceTransaction> {
  const freeCredits = amount * -100; // $5.00 in cents (negative for customer credit)
  
  return await stripe.customers.createBalanceTransaction(customerId, {
    amount: freeCredits,
    currency: 'usd',
    description: 'Free Sign-up Credit'
  });
}

/**
 * Calculate customer credit balance from transaction history
 */
export async function calculateCustomerCredits(customerId: string): Promise<CustomerCredits> {
  const balanceTransactions = await stripe.customers.listBalanceTransactions(
    customerId,
    { limit: 100 }
  );
  
  // Calculate total credits granted (all negative transactions)
  const totalCredits = balanceTransactions.data
    .filter(tx => tx.amount < 0)
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0) / 100;
  
  // Calculate used credits (all positive transactions)
  const usedCredits = balanceTransactions.data
    .filter(tx => tx.amount > 0)
    .reduce((sum, tx) => sum + tx.amount, 0) / 100;
  
  // Calculate remaining credits
  const remainingCredits = totalCredits - usedCredits;
  
  console.log(`Credit calculation for customer ${customerId}:`, {
    totalCredits,
    usedCredits,
    remainingCredits
  });
  
  return {
    total: totalCredits,
    used: usedCredits,
    remaining: remainingCredits
  };
}

/**
 * Format customer data for API response
 */
export function formatCustomerData(customer: Stripe.Customer, credits: CustomerCredits): CustomerData {
  return {
    id: customer.id,
    userId: customer.metadata.userId || 'unknown',
    email: customer.email,
    name: customer.name,
    createdAt: new Date(customer.created * 1000),
    credits
  };
} 