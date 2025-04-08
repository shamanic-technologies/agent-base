/**
 * Stripe List Refunds Utility
 * 
 * Lists refunds (money returned to customers) from Stripe using the user's API keys
 * If keys are not available, provides an API endpoint for the user to submit their keys
 */
import axios from 'axios';
import { 
  UtilityTool,
  SetupNeededResponse,
  UtilityErrorResponse
} from '../types/index.js';
import { registry } from '../registry/registry.js';
import {
  getStripeEnvironmentVariables,
  checkStripeApiKeys,
  getStripeApiKeys,
  generateSetupNeededResponse,
  formatStripeErrorResponse,
  StripeTransactionsResponse,
  StripeTransaction
} from './stripe-utils.js';

// Define the specific parameters for this utility
interface StripeListRefundsParams {
    limit?: number;
    starting_after?: string; 
    ending_before?: string; 
    charge_id?: string; // Specific param for listing refunds by charge
}

// Combined response type - simplified as StripeTransactionsResponse handles the union
// type StripeListRefundsResponse = StripeTransactionsResponse | SetupNeededResponse;

/**
 * Implementation of the Stripe List Refunds utility
 */
const stripeListRefundsUtility: UtilityTool = {
  id: 'stripe_list_refunds',
  description: 'List Stripe refunds, optionally filtered by customer or other criteria.',
  schema: {
    limit: { type: 'number', optional: true, description: 'Maximum number of refunds to return (1-100)' },
    starting_after: { type: 'string', optional: true, description: 'Cursor for pagination (refund ID)' },
    ending_before: { type: 'string', optional: true, description: 'Cursor for pagination (refund ID)' },
    charge_id: { type: 'string', optional: true, description: 'Only return refunds for a specific charge ID.' },
    // Removed customer_id as Stripe refunds list doesn't filter by customer directly
  },
  
  execute: async (userId: string, conversationId: string, params: StripeListRefundsParams): Promise<StripeTransactionsResponse> => {
    const logPrefix = '💸 [STRIPE_LIST_REFUNDS]';
    try {
      // Extract parameters with defaults
      const { 
        limit = 10,
        starting_after,
        ending_before,
        charge_id
      } = params || {};
      
      if (!userId || !conversationId) {
        console.error(`${logPrefix} Missing userId or conversationId`);
        return formatStripeErrorResponse({ message: 'Internal server error: Missing user or conversation context.' });
      }
      
      // Get necessary environment variables
      const { secretServiceUrl } = getStripeEnvironmentVariables(); // Error handled within the function

      // Check if Stripe keys exist
      const { exists } = await checkStripeApiKeys(userId, secretServiceUrl);
      if (!exists) {
          console.log(`${logPrefix} Stripe setup needed for user ${userId}`);
          return generateSetupNeededResponse(userId, conversationId, logPrefix);
      }
      
      // Get Stripe keys
      const stripeKeys = await getStripeApiKeys(userId, secretServiceUrl);
      // stripeKeys will contain { apiKey, apiSecret }
      
      // Construct query parameters for Stripe API
      const queryParams: any = { limit: Math.min(limit, 100) }; // Ensure limit is within 1-100
      if (starting_after) queryParams.starting_after = starting_after;
      if (ending_before) queryParams.ending_before = ending_before;
      
      // Add charge filter if provided
      if (charge_id) {
        queryParams.charge = charge_id; // Use the correct param name for Stripe API
      } else {
        // According to Stripe docs, listing refunds requires *either* charge OR payment_intent
        // This utility seems designed to list refunds for a specific charge.
        // If charge_id is not provided, we should return an error or clarify the utility's purpose.
        console.error(`${logPrefix} Missing required parameter: charge_id`);
        return formatStripeErrorResponse({ message: 'Missing required parameter: charge_id is needed to list refunds.' });
      }
      
      console.log(`${logPrefix} Calling Stripe API: GET /v1/refunds with params:`, queryParams);
      
      // Make the request to Stripe API
      // Note: Stripe lists refunds under /v1/refunds, optionally filtered by charge
      const stripeResponse = await axios.get(
        `https://api.stripe.com/v1/refunds`, // Use the correct refunds endpoint
        {
          params: queryParams,
          headers: {
            Authorization: `Bearer ${stripeKeys.apiSecret}`, // Use the fetched secret key
            'Stripe-Version': '2024-04-10' // Use a specific API version
          }
        }
      );
      
      console.log(`${logPrefix} Stripe API response status: ${stripeResponse.status}`);
      
      const refunds = stripeResponse.data.data || [];
      
      // Map Stripe refunds to your StripeTransaction format and convert amount
      const transactions = refunds.map((refund: any): StripeTransaction => ({
        id: refund.id,
        object: refund.object,
        amount: refund.amount / 100, // Divide amount by 100
        currency: refund.currency,
        created: new Date(refund.created * 1000).toISOString(), // Convert timestamp
        status: refund.status,
        description: refund.reason || refund.description, // Use reason if available
        customer: undefined, // Refund object doesn't directly link to customer
        // Add other relevant refund fields if needed
      }));
      
      // Return success response matching StripeTransactionsSuccessResponse structure
      const successResponse: StripeTransactionsResponse = {
        status: 'success',
        count: transactions.length,
        has_more: stripeResponse.data.has_more,
        data: transactions,
      };
      
      return successResponse;
    } catch (error: any) {
      console.error("❌ [STRIPE_LIST_REFUNDS] Error:", error);
      return formatStripeErrorResponse(error);
    }
  }
};

// Register the utility
registry.register(stripeListRefundsUtility);

// Export the utility
export default stripeListRefundsUtility; 