/**
 * Stripe Refund Utility
 * 
 * Creates a refund for a Stripe charge using the user's API keys
 * If keys are not available, provides an API endpoint for the user to submit their keys
 */
import axios from 'axios';
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
  generateSetupNeededResponse,
  formatStripeErrorResponse
} from '../external/oauth-utilities/clients/stripe-utils.js';

// --- Local Type Definitions for this Utility ---

/**
 * Represents a successful response when creating a Stripe refund.
 * Encapsulate data within a 'data' property.
 */
interface StripeRefundSuccessResponse {
  status: 'success';
  data: { // Encapsulate result in data object
    refund_id: string;
    charge_id: string;
    amount: number; // Already converted to main unit
    currency: string;
    created: string;
    reason?: string | null;
    refund_status: string; // e.g., succeeded, pending, failed
  }
}

/**
 * Union type representing all possible outcomes of this refund utility.
 */
type StripeRefundResponse = 
  SetupNeededResponse | 
  StripeRefundSuccessResponse | 
  UtilityErrorResponse;

/**
 * Request parameters for refunding a Stripe charge
 */
interface StripeRefundParams {
  charge_id: string;
  amount?: number; // Amount in CENTS
  reason?: string;
}

// --- End Local Type Definitions ---

/**
 * Implementation of the Stripe Refund utility
 */
const stripeRefundUtility: UtilityTool = {
  id: 'stripe_refund',
  description: 'Processes a refund for a specific charge in Stripe.',
  // Update schema to match Record<string, UtilityToolSchema>
  schema: {
    charge_id: { // Parameter name
      zod: z.string().startsWith('ch_')
            .describe('The ID of the charge to refund (must start with ch_).'),
      // Not optional, Zod handles this by default
      examples: ['ch_1J23456789abcdef']
    },
    amount: { // Parameter name
      zod: z.number().int().positive()
            .describe('The amount to refund in cents (e.g., 1000 for $10.00). If omitted, the entire charge is refunded.')
            .optional(),
      examples: [1000, 500]
    },
    reason: { // Parameter name
      zod: z.enum(['duplicate', 'fraudulent', 'requested_by_customer'])
            .describe('Reason for the refund.')
            .optional(),
      examples: ['duplicate', 'requested_by_customer']
    }
  },
  
  execute: async (userId: string, conversationId: string, params: StripeRefundParams): Promise<StripeRefundResponse> => {
    const logPrefix = '💸 [STRIPE_REFUND]';
    try {
      // Use raw params
      if (!params?.charge_id) {
        console.error(`${logPrefix} Missing required parameter: charge_id`);
        // Return standard UtilityErrorResponse
        return {
            status: 'error',
            error: 'Missing required parameter: charge_id.'
        };
      }
      
      const { charge_id, amount, reason } = params; // Use raw params
      
      console.log(`${logPrefix} Processing refund for charge: ${charge_id}, User: ${userId}`);
      
      // Get environment variables
      const { secretServiceUrl } = getStripeEnvironmentVariables();
      
      // Check if user has the required API keys
      const { exists } = await checkStripeApiKeys(userId, secretServiceUrl);
      if (!exists) {
        return generateSetupNeededResponse(userId, conversationId, logPrefix);
      }
      
      // Get the API keys
      const stripeKeys = await getStripeApiKeys(userId, secretServiceUrl);
      
      // Prepare the request body for Stripe API
      // NOTE: Amount here should be in cents as passed in params
      const requestBody: any = { charge: charge_id }; 
      if (amount !== undefined) {
        requestBody.amount = amount; // Send amount in cents
      }
      if (reason) {
        requestBody.reason = reason;
      }
      
      console.log(`${logPrefix} Calling Stripe API: POST /v1/refunds with body:`, requestBody);

      // Call the Stripe API to create the refund
      const stripeResponse = await axios.post(
        'https://api.stripe.com/v1/refunds',
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${stripeKeys.apiSecret}`,
            'Content-Type': 'application/x-www-form-urlencoded', // Stripe expects form-encoded data for POST
            'Stripe-Version': '2024-04-10'
          }
        }
      );
      
      console.log(`${logPrefix} Stripe API response status: ${stripeResponse.status}`);
      const refund = stripeResponse.data;
      
      // Construct success response, converting amount from cents
      const successResponse: StripeRefundSuccessResponse = {
        status: 'success',
        data: { // Encapsulate result in data object
          refund_id: refund.id,
          charge_id: refund.charge,
          amount: refund.amount / 100, // Divide amount by 100 for response
          currency: refund.currency,
          created: new Date(refund.created * 1000).toISOString(), // Convert timestamp
          reason: refund.reason,
          refund_status: refund.status
        }
      };
      
      return successResponse;
      
    } catch (error: any) {
      console.error("❌ [STRIPE_REFUND] Error:", error);
      // Remove Zod error handling
      return formatStripeErrorResponse(error);
    }
  }
};

// Register the utility
registry.register(stripeRefundUtility);

// Export the utility
export default stripeRefundUtility; 