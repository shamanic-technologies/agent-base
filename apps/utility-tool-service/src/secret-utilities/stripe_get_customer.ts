/**
 * Stripe Get Customer Utility
 * 
 * Retrieves a specific customer from Stripe by ID using the user's API keys
 * If keys are not available, provides an API endpoint for the user to submit their keys
 */
import axios from 'axios';
import { UtilityTool } from '../types/index.js';
import { registry } from '../registry/registry.js';
import {
  getStripeEnvironmentVariables,
  checkStripeApiKeys,
  generateSetupNeededResponse,
  getStripeApiKeys,
  formatStripeErrorResponse
} from './stripe-utils.js';

// Request parameters
interface StripeGetCustomerRequest {
  customer_id: string;
  expand?: string[];
}

// Customer object
interface StripeCustomer {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  description: string | null;
  created: number;
  currency: string | null;
  default_source: string | null;
  metadata: any;
  address: any | null;
  balance: number | null;
  shipping: any | null;
  discount: any | null;
  subscriptions?: any[];
  cards?: any[];
  sources?: any[];
}

// Success response
interface StripeGetCustomerSuccessResponse {
  success: true;
  customer: StripeCustomer;
}

// Error response
interface StripeGetCustomerErrorResponse {
  success: false;
  error: {
    message: string;
    type?: string;
    code?: string;
  };
}

// Add SetupNeededResponse type (can be moved to a shared types file later)
type SetupNeededResponse = {
  status: 'success';
  data: {
    needs_setup: true;
    popupUrl: string;
    provider: string;
  };
};

// Combined response type
type StripeGetCustomerResponse = StripeGetCustomerSuccessResponse | StripeGetCustomerErrorResponse | SetupNeededResponse;

/**
 * Implementation of the Stripe Get Customer utility
 */
const stripeGetCustomerUtility: UtilityTool = {
  id: 'utility_stripe_get_customer',
  description: 'Retrieve a specific customer from Stripe by ID',
  schema: {
    customer_id: {
      type: 'string',
      optional: false,
      description: 'Stripe Customer ID (starts with "cus_")'
    },
    expand: {
      type: 'array',
      optional: true,
      description: 'Additional data to include (e.g. "subscriptions", "sources", "cards")'
    }
  },
  
  execute: async (userId: string, conversationId: string, params: StripeGetCustomerRequest): Promise<StripeGetCustomerResponse> => {
    const logPrefix = '💳 [STRIPE_GET_CUSTOMER]';
    try {
      const { customer_id } = params;
      if (!customer_id || typeof customer_id !== 'string') {
        throw new Error('Invalid or missing customer_id parameter');
      }

      console.log(`${logPrefix} Getting customer ${customer_id} for user: ${userId}`);

      const { secretServiceUrl } = getStripeEnvironmentVariables();
      const { exists } = await checkStripeApiKeys(userId, secretServiceUrl);

      if (!exists) {
        // Use the new function
        return generateSetupNeededResponse(userId, conversationId, logPrefix);
      }

      const stripeKeys = await getStripeApiKeys(userId, secretServiceUrl);
      console.log(`${logPrefix} Calling Stripe API to get customer ${customer_id}`);

      // Use standard axios.get
      const stripeResponse = await axios.get(
        `https://api.stripe.com/v1/customers/${customer_id}`,
        {
          headers: {
            'Authorization': `Bearer ${stripeKeys.apiSecret}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const customer = stripeResponse.data;

      // Map the Stripe customer to our format
      const mappedCustomer: StripeCustomer = {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        phone: customer.phone,
        description: customer.description,
        created: customer.created,
        currency: customer.currency,
        default_source: customer.default_source,
        metadata: customer.metadata || {},
        address: customer.address,
        balance: customer.balance,
        shipping: customer.shipping,
        discount: customer.discount,
      };

      const successResponse: StripeGetCustomerSuccessResponse = {
        success: true,
        customer: mappedCustomer
      };

      return successResponse;
    } catch (error: any) {
      console.error(`${logPrefix} Error:`, error);
      return {
        success: false,
        error: {
          message: error.message || 'An unknown error occurred',
          type: error.response?.data?.error?.type,
          code: error.response?.data?.error?.code
        }
      };
    }
  }
};

// Register the utility
registry.register(stripeGetCustomerUtility);

// Export the utility
export default stripeGetCustomerUtility; 