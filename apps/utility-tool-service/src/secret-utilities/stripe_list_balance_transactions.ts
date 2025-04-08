/**
 * Stripe List Balance Transactions Utility
 * 
 * Lists all balance transactions from Stripe using the user's API keys
 * This provides a comprehensive view of money moving in and out of the Stripe account
 * If keys are not available, provides an API endpoint for the user to submit their keys
 */
import Stripe from 'stripe';
import { 
  UtilityTool,
  StripeTransactionsRequest,
  StripeTransactionsResponse,
  StripeTransactionsSuccessResponse,
  SetupNeededResponse,
  UtilityErrorResponse,
  StripeTransaction
} from '../types/index.js';
import { registry } from '../registry/registry.js';
import {
  checkStripeApiKeys,
  generateSetupNeededResponse,
  getStripeApiKeys,
  formatStripeErrorResponse
} from './stripe-utils.js';

/**
 * Available transaction types to filter by
 */
type StripeTransactionType = 
  'charge' | 
  'refund' | 
  'adjustment' | 
  'application_fee' | 
  'application_fee_refund' | 
  'dispute' | 
  'payment' | 
  'payout' | 
  'transfer';

/**
 * Implementation of the Stripe List Balance Transactions utility
 */
const stripeListBalanceTransactions: UtilityTool = {
  id: 'utility_stripe_list_balance_transactions',
  description: 'Lists balance transactions from Stripe',
  schema: {
    limit: { type: 'number', optional: true, description: 'Max number of transactions (default 10)' },
    starting_after: { type: 'string', optional: true, description: 'Pagination cursor' },
    ending_before: { type: 'string', optional: true, description: 'Pagination cursor' },
    type: { type: 'string', optional: true, description: 'Filter by transaction type' },
  },
  
  execute: async (userId: string, conversationId: string, params: StripeTransactionsRequest): Promise<StripeTransactionsResponse> => {
    const logPrefix = '💰 [STRIPE_LIST_BALANCE_TRANSACTIONS]';
    try {
      const { limit = 10, starting_after, ending_before, type } = params;
      console.log(`${logPrefix} Listing balance transactions for user ${userId}`);
      
      // Check if keys exist
      // Note: getStripeEnvironmentVariables is implicitly called within helpers
      const secretServiceUrl = process.env.SECRET_SERVICE_URL; // Needed for utils
      if (!secretServiceUrl) throw new Error('SECRET_SERVICE_URL not set');

      const { exists } = await checkStripeApiKeys(userId, secretServiceUrl);
      
      if (!exists) {
        // Return standard setup needed response
        const setupResponse: SetupNeededResponse = generateSetupNeededResponse(userId, conversationId, logPrefix);
        // Need to check if generateSetupNeededResponse might throw or return error
        // Assuming it returns SetupNeededResponse based on its signature
        return setupResponse;
      }
      
      // Get API keys
      const stripeKeys = await getStripeApiKeys(userId, secretServiceUrl);
      
      // Initialize Stripe client
      const stripe = new Stripe(stripeKeys.apiSecret, {
        apiVersion: '2025-02-24.acacia', // Use API version suggested by linter
      });

      // Prepare parameters for Stripe API
      const listParams: Stripe.BalanceTransactionListParams = {
        limit: Math.min(limit, 100),
        starting_after,
        ending_before,
        type,
      };

      // Fetch transactions
      const transactions = await stripe.balanceTransactions.list(listParams);
      
      // Prepare success response
      const successResponse: StripeTransactionsSuccessResponse = {
        status: 'success',
        count: transactions.data.length,
        has_more: transactions.has_more,
        data: transactions.data as unknown as StripeTransaction[], // Cast needed if types differ
      };
      return successResponse;
      
    } catch (error) {
      console.error(`${logPrefix} Error:`, error);
      // Use the standardized error formatter
      const errorResponse: UtilityErrorResponse = formatStripeErrorResponse(error);
      return errorResponse;
    }
  }
};

// Register the utility
registry.register(stripeListBalanceTransactions);

// Export the utility
export default stripeListBalanceTransactions; 