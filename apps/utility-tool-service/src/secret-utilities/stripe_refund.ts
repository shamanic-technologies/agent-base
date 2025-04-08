/**
 * Stripe Refund Utility
 * 
 * Creates a refund for a Stripe charge using the user's API keys
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
  formatStripeErrorResponse
} from './stripe-utils.js';

// --- Local Type Definitions for this Utility ---

/**
 * Represents a successful response when creating a Stripe refund.
 */
interface StripeRefundSuccessResponse {
  status: 'success';
  refund_id: string;
  charge_id: string;
  amount: number;
  currency: string;
  created: string;
  reason?: string | null;
  refund_status: string; // e.g., succeeded, pending, failed
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
  amount?: number;
  reason?: string;
}

// --- End Local Type Definitions ---

/**
 * Implementation of the Stripe Refund utility
 */
const stripeRefundUtility: UtilityTool = {
  id: 'stripe_refund',
  description: 'Processes a refund for a specific charge in Stripe.',
  schema: {
    charge_id: { type: 'string', optional: false, description: 'The ID of the charge to refund.' },
    amount: { type: 'number', optional: true, description: 'The amount to refund in cents. If omitted, the entire charge is refunded.' },
    reason: { type: 'string', optional: true, description: 'Reason for the refund (e.g., duplicate, fraudulent, requested_by_customer).' },
  },
  
  execute: async (userId: string, conversationId: string, params: StripeRefundParams): Promise<StripeRefundResponse> => {
    const logPrefix = '💸 [STRIPE_REFUND]';
    try {
      // Validate required parameters
      if (!params?.charge_id) {
        console.error(`${logPrefix} Missing required parameter: charge_id`);
        return formatStripeErrorResponse({ message: 'Missing required parameter: charge_id.' });
      }
      
      const { charge_id, amount, reason } = params;
      
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
      const requestBody: any = { charge: charge_id };
      if (amount !== undefined) {
        requestBody.amount = amount;
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
        refund_id: refund.id,
        charge_id: refund.charge,
        amount: refund.amount / 100, // Divide amount by 100
        currency: refund.currency,
        created: new Date(refund.created * 1000).toISOString(), // Convert timestamp
        reason: refund.reason,
        refund_status: refund.status
      };
      
      return successResponse;
      
    } catch (error: any) {
      console.error("❌ [STRIPE_REFUND] Error:", error);
      return formatStripeErrorResponse(error);
    }
  }
};

// Register the utility
registry.register(stripeRefundUtility);

// Export the utility
export default stripeRefundUtility; 