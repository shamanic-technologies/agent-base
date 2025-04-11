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
  SetupNeededResponse,
  UtilityErrorResponse
} from '../types/index.js'; // Keep generic types
import { registry } from '../registry/registry.js';
import {
  getStripeEnvironmentVariables,
  checkStripeApiKeys,
  getStripeApiKeys,
  generateSetupNeededResponse,
  formatStripeErrorResponse,
  // Import Stripe-specific types from stripe-utils
  StripeTransactionsRequest, 
  StripeTransactionsResponse,
  StripeTransaction,
  StripeTransactionsSuccessResponse // Also needed for constructing success response
} from '../clients/stripe-utils.js';

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
        // Use API version required by installed Stripe library types
        apiVersion: '2025-03-31.basil',
      });

      // Prepare parameters for Stripe API
      const listParams: Stripe.BalanceTransactionListParams = {
        limit: Math.min(limit, 100),
        starting_after,
        ending_before,
        type,
      };

      // Fetch transactions
      const transactionsResponse = await stripe.balanceTransactions.list(listParams);
      
      // Map transactions and convert amount from cents to main unit
      const processedData = transactionsResponse.data.map(tx => ({
        ...tx,
        // Convert Unix timestamp (seconds) to ISO 8601 string
        created: new Date(tx.created * 1000).toISOString(), 
        // Divide amount by 100 to convert from cents to main currency unit
        amount: tx.amount / 100,
        // Ensure net amount is also converted if it exists (common in balance transactions)
        net: tx.net ? tx.net / 100 : undefined,
        // Ensure fee is also converted if it exists
        fee: tx.fee ? tx.fee / 100 : undefined
      }));
      
      // Prepare success response with processed data
      const successResponse: StripeTransactionsSuccessResponse = {
        status: 'success',
        count: processedData.length,
        has_more: transactionsResponse.has_more,
        data: processedData as unknown as StripeTransaction[], // Use processed data
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