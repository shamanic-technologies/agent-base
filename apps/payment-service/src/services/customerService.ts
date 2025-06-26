/**
 * Customer service for managing Stripe customers
 */
import { stripe } from '../config/index.js';
import { AgentBaseAutoRechargeSettings, AgentBaseCustomerCredits, AgentBasePricing, AgentBaseStripeCustomerInformation } from '@agent-base/types';
import Stripe from 'stripe';
import { addCredit } from './creditService.js';


/**
 * Add free sign-up credit to a new customer
 */
export async function addFreeSignupCredit(stripeCustomerId: string): Promise<Stripe.CustomerBalanceTransaction> {
  const freeCreditsInUSDCents = AgentBasePricing.AGENT_BASE_FREE_SIGNUP_CREDIT_AMOUNT_IN_USD_CENTS; // $5.00 in cents (negative for customer credit)
  
  // Add credits to customer balance
  const addedCreditResponse = await addCredit(
    stripeCustomerId, 
    freeCreditsInUSDCents, 
    'Free Sign-up Credit'
  );
  const { transaction, newBalance } = addedCreditResponse;
  return transaction;
}

/**
 * Calculate customer credit balance from transaction history
 */
export async function calculateCustomerCredits(stripeCustomerId: string): Promise<AgentBaseCustomerCredits> {
  let allTransactions: Stripe.CustomerBalanceTransaction[] = [];
  let hasMore = true;
  let startingAfter: string | undefined = undefined;

  while (hasMore) {
    const balanceTransactions: Stripe.ApiList<Stripe.CustomerBalanceTransaction> = await stripe.customers.listBalanceTransactions(
    stripeCustomerId,
      { limit: 100, starting_after: startingAfter }
  );

    allTransactions = allTransactions.concat(balanceTransactions.data);
    hasMore = balanceTransactions.has_more;
    if (hasMore) {
      startingAfter = allTransactions[allTransactions.length - 1].id;
    }
  }
  
  const customer = await stripe.customers.retrieve(stripeCustomerId);

  if (!customer || 'deleted' in customer) {
    throw new Error('Customer not found or has been deleted');
  }
  
  // Calculate total credits granted (all negative transactions)
  const totalInUSDCents = allTransactions
    .filter(tx => tx.amount < 0)
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  
  // Remaining credits are the inverse of the customer's balance
  const remainingInUSDCents = -customer.balance;
  
  // Used credits are the difference
  const usedInUSDCents = totalInUSDCents - remainingInUSDCents;
  
  return {
    totalInUSDCents,
    usedInUSDCents,
    remainingInUSDCents,
  };
}

/**
 * Get customer's auto-recharge settings from metadata
 */
export async function getAutoRechargeSettings(stripeCustomerId: string): Promise<AgentBaseAutoRechargeSettings | null> {
  const customer = await stripe.customers.retrieve(stripeCustomerId);
  
  if ('deleted' in customer) {
    return null;
  }
  
  const { metadata } = customer;
  
  if (
    !metadata?.platformUserId ||
    !metadata?.auto_recharge_enabled || 
    !metadata?.auto_recharge_threshold_in_usd_cents || 
    !metadata?.auto_recharge_amount_in_usd_cents
  ) {
    return null;
  }
  
  return {
    platformUserId: metadata.platformUserId,
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
  settings: AgentBaseAutoRechargeSettings
): Promise<Stripe.Customer> {
  const updatedCustomer = await stripe.customers.update(stripeCustomerId, {
    metadata: {
      auto_recharge_enabled: settings.enabled.toString(),
      auto_recharge_threshold_in_usd_cents: settings.thresholdAmountInUSDCents.toString(),
      auto_recharge_amount_in_usd_cents: settings.rechargeAmountInUSDCents.toString()
    }
  });
  return updatedCustomer;
}

/**
 * Format customer data for API response
 */
export function formatCustomerData(customer: Stripe.Customer, credits: AgentBaseCustomerCredits): AgentBaseStripeCustomerInformation {
  // Extract auto-recharge settings from metadata if they exist
  let autoRechargeSettings: AgentBaseAutoRechargeSettings | undefined;
  
  if (
    customer.metadata?.platformUserId &&
    customer.metadata?.auto_recharge_enabled && 
    customer.metadata?.auto_recharge_threshold_in_usd_cents && 
    customer.metadata?.auto_recharge_amount_in_usd_cents
  ) {
    autoRechargeSettings = {
      platformUserId: customer.metadata.platformUserId,
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

/**
 * Get or create a Stripe customer.
 * If the customer exists, it returns the existing customer.
 * If the customer does not exist, it creates a new customer and adds free sign-up credit.
 *
 * @param platformUserId The platform user ID.
 * @param platformUserEmail Optional email for the new customer.
 * @param platformUserName Optional name for the new customer.
 * @returns The Stripe Customer object.
 */
export async function getOrCreateStripeCustomer(
  platformUserId: string,
  platformUserEmail?: string,
  platformUserName?: string
): Promise<Stripe.Customer> {
  // Try to find an existing customer
  let customer = await _findStripeCustomerByPlatformUserId(platformUserId);

  // If customer doesn't exist, create a new one and add free credit
  if (!customer) {
    customer = await _createCustomer(platformUserId, platformUserEmail, platformUserName);
    // Add free sign-up credit to the new customer
    await addFreeSignupCredit(customer.id);
  }

  return customer;
} 

/**
 * Find a customer by user ID
 */
async function _findStripeCustomerByPlatformUserId(platformUserId: string): Promise<Stripe.Customer | null> {
  const customers = await stripe.customers.search({
    query: `metadata['platformUserId']:'${platformUserId}'`,
    limit: 1
  });
  
  return customers.data.length > 0 ? customers.data[0] : null;
}

/**
 * Create a new customer in Stripe
 */
async function _createCustomer(platformUserId: string, platformUserEmail?: string, platformUserName?: string): Promise<Stripe.Customer> {
  const customerParams: Stripe.CustomerCreateParams = {
    metadata: {
      platformUserId: platformUserId
    }
  };
  
  // Add email and name if available
  if (platformUserEmail) customerParams.email = platformUserEmail;
  if (platformUserName) customerParams.name = platformUserName;
  
  const customer = await stripe.customers.create(customerParams);
  return customer;
}
