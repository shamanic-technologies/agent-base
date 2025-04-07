/** * Stripe List Charges Utility
 * 
 * Lists charges (payments received) from Stripe using the user's API keys
 * If keys are not available, provides an API endpoint for the user to submit their keys
 */
import axios from 'axios';
const axiosClient = axios;
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
  getStripeApiKeys,
  formatStripeErrorResponse,
  generateSetupNeededResponse
} from './stripe-utils.js';

// Add SetupNeededResponse type
type SetupNeededResponse = {
  status: 'success';
  data: {
    needs_setup: true;
    popupUrl: string;
    provider: string;
  };
};

// Combined response type
type StripeListChargesResponse = StripeTransactionsSuccessResponse | StripeTransactionsErrorResponse | SetupNeededResponse;

/**
 * Implementation of the Stripe List Charges utility
 */
const stripeListChargesUtility: UtilityTool = {
  id: 'utility_stripe_list_charges',
  description: 'List charges (payments received) from Stripe',
  schema: {
    limit: {
      type: 'number',
      optional: true,
      description: 'Maximum number of charges to return (default: 10)'
    },
    starting_after: {
      type: 'string',
      optional: true,
      description: 'Cursor for pagination, charge ID to start after'
    },
    ending_before: {
      type: 'string',
      optional: true,
      description: 'Cursor for pagination, charge ID to end before'
    }
  },
  
  execute: async (userId: string, conversationId: string, params: StripeListTransactionsRequest): Promise<StripeListChargesResponse> => {
    const logPrefix = '💳 [STRIPE_LIST_CHARGES]';
    try {
      // Extract parameters with defaults
      const { 
        limit = 10,
        starting_after,
        ending_before
      } = params || {};
      
      console.log(`${logPrefix} Listing charges for user: ${userId}`);
      
      // Get environment variables
      const { secretServiceUrl } = getStripeEnvironmentVariables();
      
      // Check if user has the required API keys
      const { exists } = await checkStripeApiKeys(userId, secretServiceUrl);
      
      // If we don't have the API keys, return setup needed response
      if (!exists) {
        return generateSetupNeededResponse(userId, conversationId, logPrefix);
      }
      
      // Get the API keys
      const stripeKeys = await getStripeApiKeys(userId, secretServiceUrl);
      
      // Call the Stripe API with the secret key
      console.log(`${logPrefix} Calling Stripe API`);
      
      const queryParams = {
        limit,
        starting_after: starting_after || undefined,
        ending_before: ending_before || undefined
      };
      
      // @ts-ignore - axios typing issue with version 1.8.4
      const stripeResponse = await axiosClient.get(
        'https://api.stripe.com/v1/charges',
        {
          params: queryParams,
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
      console.error("❌ [STRIPE_LIST_CHARGES] Error:", error);
      return formatStripeErrorResponse(error);
    }
  }
};

// Register the utility
registry.register(stripeListChargesUtility);

// Export the utility
export default stripeListChargesUtility;

