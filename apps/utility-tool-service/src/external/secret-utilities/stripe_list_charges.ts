/** * Stripe List Charges Utility
 * 
 * Lists charges (payments received) from Stripe using the user's API keys
 * If keys are not available, provides an API endpoint for the user to submit their keys
 */
import axios from 'axios';
const axiosClient = axios;
import { z } from 'zod'; // Import Zod
import { 
  UtilityTool, 
  SetupNeededResponse,
  UtilityErrorResponse,
  UtilityToolSchema // Import if needed
} from '../../types/index.js';
import { registry } from '../../registry/registry.js';
import {
  getStripeEnvironmentVariables,
  checkStripeApiKeys,
  getStripeApiKeys,
  formatStripeErrorResponse,
  generateSetupNeededResponse,
  StripeTransactionsRequest, 
  StripeTransactionsResponse,
  StripeTransaction
} from '../external/oauth-utilities/clients/stripe-utils.js';

// Combined response type - simplified as StripeTransactionsResponse handles the union
// type StripeListChargesResponse = StripeTransactionsResponse | SetupNeededResponse;

/**
 * Implementation of the Stripe List Charges utility
 */
const stripeListChargesUtility: UtilityTool = {
  id: 'utility_stripe_list_charges',
  description: 'List charges (payments received) from Stripe',
  // Update schema to match Record<string, UtilityToolSchema>
  schema: {
    limit: { // Parameter name
      zod: z.number().int().positive().max(100)
            .describe('Maximum number of charges to return (1-100, default 10)')
            .optional(),
      examples: [10, 50]
    },
    starting_after: { // Parameter name
      zod: z.string().startsWith('ch_') // Charge IDs start with ch_
            .describe('Pagination cursor, charge ID to start after')
            .optional(),
      examples: ['ch_1J23456789abcdef']
    },
    ending_before: { // Parameter name
      zod: z.string().startsWith('ch_') // Charge IDs start with ch_
            .describe('Pagination cursor, charge ID to end before')
            .optional(),
      examples: ['ch_9K87654321fedcba']
    }
  },
  
  execute: async (userId: string, conversationId: string, params: StripeTransactionsRequest): Promise<StripeTransactionsResponse> => {
    const logPrefix = '💳 [STRIPE_LIST_CHARGES]';
    try {
      // Use raw params, validation happens elsewhere
      const { 
        limit = 10,
        starting_after,
        ending_before
      } = params || {}; // Use raw params
      
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
        limit: Math.min(limit, 100), // Ensure limit is within bounds
        starting_after: starting_after || undefined,
        ending_before: ending_before || undefined
      };
      
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
      
      // Map Stripe charges to your StripeTransaction format and convert amount
      const transactions = charges.map((charge: any): StripeTransaction => ({
        id: charge.id,
        object: charge.object,
        amount: charge.amount / 100, // Divide amount by 100
        currency: charge.currency,
        created: new Date(charge.created * 1000).toISOString(), // Convert timestamp
        status: charge.status,
        description: charge.description,
        customer: charge.customer,
        // Add amount_captured if it exists, also divided by 100
        amount_captured: charge.amount_captured ? charge.amount_captured / 100 : undefined,
        // Add amount_refunded if it exists, also divided by 100
        amount_refunded: charge.amount_refunded ? charge.amount_refunded / 100 : undefined
      }));

      // Return success response matching StripeTransactionsSuccessResponse structure
      // Ensure StripeTransactionsResponse is the correct type for success here
      const successResponse: StripeTransactionsResponse = {
        status: 'success',
        count: transactions.length,
        has_more: stripeResponse.data.has_more,
        data: transactions,
      };
      return successResponse; // Return the correctly typed object
    } catch (error: any) {
      console.error("❌ [STRIPE_LIST_CHARGES] Error:", error);
      // Remove Zod error handling
      // Use the utility function which should return UtilityErrorResponse
      return formatStripeErrorResponse(error);
    }
  }
};

// Register the utility
registry.register(stripeListChargesUtility);

// Export the utility
export default stripeListChargesUtility;

