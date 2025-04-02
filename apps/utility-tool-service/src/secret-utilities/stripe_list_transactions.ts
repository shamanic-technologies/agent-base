/**
 * Stripe List Transactions Utility
 * 
 * Lists transactions from Stripe using the user's API keys
 * If keys are not available, provides an API endpoint for the user to submit their keys
 */
import axios from 'axios';
import { 
  UtilityTool, 
  StripeListTransactionsRequest, 
  StripeListTransactionsResponse,
  StripeAuthNeededResponse,
  StripeTransactionsSuccessResponse,
  StripeTransactionsErrorResponse,
  StripeTransaction
} from '../types/index.js';
import { registry } from '../registry/registry.js';
import {
  getStripeEnvironmentVariables,
  checkStripeApiKeys,
  generateAuthNeededResponse,
  getStripeApiKeys,
  formatStripeErrorResponse
} from './stripe-utils.js';

/**
 * Implementation of the Stripe List Transactions utility
 */
const stripeListTransactionsUtility: UtilityTool = {
  id: 'utility_stripe_list_transactions',
  description: 'List transactions from Stripe',
  schema: {
    limit: {
      type: 'number',
      optional: true,
      description: 'Maximum number of transactions to return (default: 10)'
    },
    starting_after: {
      type: 'string',
      optional: true,
      description: 'Cursor for pagination, transaction ID to start after'
    },
    ending_before: {
      type: 'string',
      optional: true,
      description: 'Cursor for pagination, transaction ID to end before'
    }
  },
  
  execute: async (userId: string, conversationId: string, params: StripeListTransactionsRequest): Promise<StripeListTransactionsResponse> => {
    try {
      // Extract parameters with defaults
      const { 
        limit = 10,
        starting_after,
        ending_before
      } = params || {};
      
      console.log(`💳 [STRIPE_LIST_TRANSACTIONS] Listing transactions for user: ${userId}`);
      
      // Get environment variables
      const { secretServiceUrl, apiGatewayUrl } = getStripeEnvironmentVariables();
      
      // Check if user has the required API keys
      const { exists } = await checkStripeApiKeys(userId, secretServiceUrl);
      
      // If we don't have the API keys, return auth needed response
      if (!exists) {
        return generateAuthNeededResponse(apiGatewayUrl, '💳 [STRIPE_LIST_TRANSACTIONS]');
      }
      
      // Get the API keys
      const stripeKeys = await getStripeApiKeys(userId, secretServiceUrl);
      
      // Call the Stripe API with the secret key
      console.log(`💳 [STRIPE_LIST_TRANSACTIONS] Calling Stripe API to list transactions`);
      
      const stripeResponse = await axios.get(
        'https://api.stripe.com/v1/charges',
        {
          params: {
            limit,
            starting_after: starting_after || undefined,
            ending_before: ending_before || undefined
          },
          headers: {
            'Authorization': `Bearer ${stripeKeys.apiSecret}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      const charges = stripeResponse.data.data || [];
      
      // Map the Stripe charges to our transaction format
      const transactions: StripeTransaction[] = charges.map((charge: any) => ({
        id: charge.id,
        amount: charge.amount / 100, // Convert from cents to dollars
        currency: charge.currency,
        description: charge.description || '',
        status: charge.status,
        created: charge.created,
        customer: charge.customer,
        metadata: charge.metadata
      }));
      
      // Return the transactions
      const successResponse: StripeTransactionsSuccessResponse = {
        success: true,
        count: transactions.length,
        transactions,
        has_more: stripeResponse.data.has_more || false
      };
      
      return successResponse;
    } catch (error) {
      console.error("❌ [STRIPE_LIST_TRANSACTIONS] Error:", error);
      return formatStripeErrorResponse(error);
    }
  }
};

// Register the utility
registry.register(stripeListTransactionsUtility);

// Export the utility
export default stripeListTransactionsUtility;
