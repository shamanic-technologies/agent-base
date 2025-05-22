/**
 * Customer service for managing Stripe customers
 */
import { stripe } from '../config/index.js';
import { AutoRechargeSettings, CustomerCredits, Pricing, StripeCustomerInformation } from '@agent-base/types';
import Stripe from 'stripe';

/**
 * Find a customer by user ID
 */
export async function findStripeCustomerByPlatformUserId(platformUserId: string): Promise<Stripe.Customer | null> {
  const customers = await stripe.customers.search({
    query: `metadata['platformUserId']:'${platformUserId}'`,
    limit: 1
  });
  
  return customers.data.length > 0 ? customers.data[0] : null;
}

/**
 * Create a new customer in Stripe
 */
export async function createCustomer(platformUserId: string, platformUserEmail?: string, platformUserName?: string): Promise<Stripe.Customer> {
  const customerParams: Stripe.CustomerCreateParams = {
    metadata: {
      platformUserId: platformUserId
    }
  };
  
  // Add email and name if available
  if (platformUserEmail) customerParams.email = platformUserEmail;
  if (platformUserName) customerParams.name = platformUserName;
  
  console.log(`Creating new customer with params:`, customerParams);
  return await stripe.customers.create(customerParams);
}

/**
 * Add free sign-up credit to a new customer
 */
export async function addFreeSignupCredit(stripeCustomerId: string, amountInUSDCents: number = Pricing.FREE_SIGNUP_CREDIT_AMOUNT_IN_USD_CENTS): Promise<Stripe.CustomerBalanceTransaction> {
  const freeCreditsInUSDCents = amountInUSDCents * -1; // $5.00 in cents (negative for customer credit)
  
  return await stripe.customers.createBalanceTransaction(stripeCustomerId, {
    amount: freeCreditsInUSDCents,
    currency: 'usd',
    description: 'Free Sign-up Credit'
  });
}

/**
 * Calculate customer credit balance from transaction history
 */
export async function calculateCustomerCredits(stripeCustomerId: string): Promise<CustomerCredits> {
  const balanceTransactions = await stripe.customers.listBalanceTransactions(
    stripeCustomerId,
    { limit: 100 }
  );
  
  // Calculate total credits granted (all negative transactions)
  const totalCreditsInUSDCents = balanceTransactions.data
    .filter(tx => tx.amount < 0)
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0) / 100;
  
  // Calculate used credits (all positive transactions)
  const usedCreditsInUSDCents = balanceTransactions.data
    .filter(tx => tx.amount > 0)
    .reduce((sum, tx) => sum + tx.amount, 0) / 100;
  
  // Calculate remaining credits
  const remainingCreditsInUSDCents = totalCreditsInUSDCents - usedCreditsInUSDCents;
  
  console.log(`Credit calculation for customer ${stripeCustomerId}:`, {
    totalCreditsInUSDCents,
    usedCreditsInUSDCents,
    remainingCreditsInUSDCents
  });
  
  return {
    totalInUSDCents: totalCreditsInUSDCents,
    usedInUSDCents: usedCreditsInUSDCents,
    remainingInUSDCents: remainingCreditsInUSDCents
  };
}

/**
 * Get customer's auto-recharge settings from metadata
 */
export async function getAutoRechargeSettings(stripeCustomerId: string): Promise<AutoRechargeSettings | null> {
  const customer = await stripe.customers.retrieve(stripeCustomerId);
  
  if ('deleted' in customer) {
    return null;
  }
  
  const { metadata } = customer;
  
  if (
    !metadata?.auto_recharge_enabled || 
    !metadata?.auto_recharge_threshold_in_usd_cents || 
    !metadata?.auto_recharge_amount_in_usd_cents
  ) {
    return null;
  }
  
  return {
    enabled: metadata.auto_recharge_enabled === 'true',
    thresholdAmountInUSDCents: parseFloat(metadata.auto_recharge_threshold_in_usd_cents),
    rechargeAmountInUSDCents: parseFloat(metadata.auto_recharge_amount_in_usd_cents)
  };
}

/**
 * Update customer's auto-recharge settings
 */
export async function updateAutoRechargeSettings(
  stripeCustomerId: string, 
  settings: AutoRechargeSettings
): Promise<Stripe.Customer> {
  return await stripe.customers.update(stripeCustomerId, {
    metadata: {
      auto_recharge_enabled: settings.enabled.toString(),
      auto_recharge_threshold_in_usd_cents: settings.thresholdAmountInUSDCents.toString(),
      auto_recharge_amount_in_usd_cents: settings.rechargeAmountInUSDCents.toString()
    }
  });
}

/**
 * Format customer data for API response
 */
export function formatCustomerData(customer: Stripe.Customer, credits: CustomerCredits): StripeCustomerInformation {
  // Extract auto-recharge settings from metadata if they exist
  let autoRechargeSettings: AutoRechargeSettings | undefined;
  
  if (
    customer.metadata?.auto_recharge_enabled && 
    customer.metadata?.auto_recharge_threshold_in_usd_cents && 
    customer.metadata?.auto_recharge_amount_in_usd_cents
  ) {
    autoRechargeSettings = {
      enabled: customer.metadata.auto_recharge_enabled === 'true',
      thresholdAmountInUSDCents: parseFloat(customer.metadata.auto_recharge_threshold_in_usd_cents),
      rechargeAmountInUSDCents: parseFloat(customer.metadata.auto_recharge_amount_in_usd_cents)
    };
  }
  
  return {
    stripeCustomerId: customer.id,
    stripePlatformUserId: customer.metadata.platformUserId,
    stripeEmail: customer.email,
    stripeName: customer.name,
    stripeCreatedAt: new Date(customer.created * 1000),
    stripeCredits: credits,
    autoRechargeSettings
  };
} 