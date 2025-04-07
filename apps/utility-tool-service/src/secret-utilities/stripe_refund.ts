/**
 * Stripe Refund Utility
 * 
 * Creates a refund for a Stripe charge using the user's API keys
 * If keys are not available, provides an API endpoint for the user to submit their keys
 */
import axios from 'axios';
import { 
  UtilityTool,
  StripeAuthNeededResponse,
  StripeTransactionsErrorResponse
} from '../types/index.js';
import { registry } from '../registry/registry.js';
import {
  getStripeEnvironmentVariables,
  checkStripeApiKeys,
  generateSetupNeededResponse,
  getStripeApiKeys,
  formatStripeErrorResponse
} from './stripe-utils.js';

/**
 * Request parameters for refunding a Stripe charge
 */
interface StripeRefundRequest {
  charge_id: string;
  amount?: number;
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
}

/**
 * Successful refund response
 */
interface StripeRefundSuccessResponse {
  success: true;
  refund: {
    id: string;
    amount: number;
    currency: string;
    charge: string;
    status: string;
    created: number;
  };
}

/**
 * Union type for all possible refund responses
 */
type StripeRefundResponse = StripeAuthNeededResponse | StripeRefundSuccessResponse | StripeTransactionsErrorResponse | SetupNeededResponse;

/**
 * Add SetupNeededResponse type
 */
type SetupNeededResponse = {
  status: 'success';
  data: {
    needs_setup: true;
    popupUrl: string;
    provider: string;
  };
};

/**
 * Implementation of the Stripe Refund utility
 */
const stripeRefundUtility: UtilityTool = {
  id: 'utility_stripe_refund',
  description: 'Refund a Stripe charge',
  schema: {
    charge_id: {
      type: 'string',
      optional: false,
      description: 'ID of the charge to refund (e.g., ch_...)'
    },
    amount: {
      type: 'number',
      optional: true,
      description: 'Amount to refund in dollars (default: full amount)'
    },
    reason: {
      type: 'string',
      optional: true,
      description: 'Reason for the refund: "duplicate", "fraudulent", or "requested_by_customer"'
    }
  },
  
  execute: async (userId: string, conversationId: string, params: StripeRefundRequest): Promise<StripeRefundResponse> => {
    const logPrefix = '💳 [STRIPE_REFUND]';
    try {
      // Extract required parameters
      const { 
        charge_id,
        amount,
        reason
      } = params || {};
      
      // Validate charge_id
      if (!charge_id) {
        throw new Error('charge_id is required');
      }
      
      // Validate charge_id format
      if (!charge_id.startsWith('ch_')) {
        throw new Error('Invalid charge_id format. It should start with "ch_"');
      }
      
      console.log(`${logPrefix} Processing refund for charge: ${charge_id}, user: ${userId}`);
      
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
      console.log(`${logPrefix} Calling Stripe API to create refund for charge: ${charge_id}`);
      
      // Build the request body for the refund
      const refundPayload: any = {
        charge: charge_id,
      };
      
      // Add optional parameters if provided
      if (amount) {
        // Convert dollars to cents for Stripe
        refundPayload.amount = Math.round(amount * 100);
      }
      
      if (reason) {
        refundPayload.reason = reason;
      }
      
      // Make the API call to create the refund
      const stripeResponse = await axios.post(
        'https://api.stripe.com/v1/refunds',
        new URLSearchParams(refundPayload).toString(),
        {
          headers: {
            'Authorization': `Bearer ${stripeKeys.apiSecret}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      const refund = stripeResponse.data;
      
      // Format and return the successful refund response
      const successResponse: StripeRefundSuccessResponse = {
        success: true,
        refund: {
          id: refund.id,
          amount: refund.amount / 100, // Convert cents to dollars
          currency: refund.currency,
          charge: refund.charge,
          status: refund.status,
          created: refund.created
        }
      };
      
      return successResponse;
    } catch (error) {
      console.error("❌ [STRIPE_REFUND] Error:", error);
      return formatStripeErrorResponse(error);
    }
  }
};

// Register the utility
registry.register(stripeRefundUtility);

// Export the utility
export default stripeRefundUtility; 