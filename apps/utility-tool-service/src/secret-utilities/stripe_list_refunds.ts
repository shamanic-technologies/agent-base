/**
 * Stripe List Refunds Utility
 * 
 * Lists refunds (money returned to customers) from Stripe using the user's API keys
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
  generateSetupNeededResponse,
  getStripeApiKeys,
  formatStripeErrorResponse
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
type StripeListRefundsResponse = StripeTransactionsSuccessResponse | StripeTransactionsErrorResponse | SetupNeededResponse;

/**
 * Implementation of the Stripe List Refunds utility
 */
const stripeListRefundsUtility: UtilityTool = {
  id: 'utility_stripe_list_refunds',
  description: 'List refunds (money returned to customers) from Stripe',
  schema: {
    limit: {
      type: 'number',
      optional: true,
      description: 'Maximum number of refunds to return (default: 10)'
    },
    starting_after: {
      type: 'string',
      optional: true,
      description: 'Cursor for pagination, refund ID to start after'
    },
    ending_before: {
      type: 'string',
      optional: true,
      description: 'Cursor for pagination, refund ID to end before'
    },
    charge: {
      type: 'string',
      optional: true,
      description: 'Only return refunds for this charge ID'
    }
  },
  
  execute: async (userId: string, conversationId: string, params: StripeListTransactionsRequest & { charge?: string }): Promise<StripeListRefundsResponse> => {
    const logPrefix = '💳 [STRIPE_LIST_REFUNDS]';
    try {
      // Extract parameters with defaults
      const { 
        limit = 10,
        starting_after,
        ending_before,
        charge
      } = params || {};
      
      console.log(`${logPrefix} Listing refunds for user: ${userId}`);
      
      // Get environment variables
      const { secretServiceUrl, apiGatewayUrl } = getStripeEnvironmentVariables();
      
      // Check if user has the required API keys
      const { exists } = await checkStripeApiKeys(userId, secretServiceUrl);
      
      // If we don't have the API keys, return auth needed response
      if (!exists) {
        return generateSetupNeededResponse(userId, conversationId, logPrefix);
      }
      
      // Get the API keys
      const stripeKeys = await getStripeApiKeys(userId, secretServiceUrl);
      
      // Call the Stripe API with the secret key
      console.log(`${logPrefix} Calling Stripe API`);
      
      // Build query parameters
      const queryParams: any = {
        limit,
        starting_after: starting_after || undefined,
        ending_before: ending_before || undefined
      };
      
      // Add charge filter if provided
      if (charge) {
        queryParams.charge = charge;
      }
      
      const stripeResponse = await axios.get(
        `https://api.stripe.com/v1/charges/${charge}/refunds`,
        {
          params: queryParams,
          headers: {
            'Authorization': `Bearer ${stripeKeys.apiSecret}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      const refunds = stripeResponse.data.data || [];
      
      // Map the Stripe refunds to our transaction format
      const transactions: StripeTransaction[] = refunds.map((refund: any) => ({
        id: refund.id,
        amount: -1 * refund.amount / 100, // Convert to negative dollars to indicate outflow
        currency: refund.currency,
        description: `Refund for charge: ${refund.charge}`,
        status: refund.status,
        created: refund.created,
        metadata: refund.metadata,
        reason: refund.reason || null,
        charge_id: refund.charge
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
      console.error("❌ [STRIPE_LIST_REFUNDS] Error:", error);
      return formatStripeErrorResponse(error);
    }
  }
};

// Register the utility
registry.register(stripeListRefundsUtility);

// Export the utility
export default stripeListRefundsUtility; 