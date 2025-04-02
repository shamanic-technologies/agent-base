/**
 * Stripe List Customers Utility
 * 
 * Lists customers from Stripe using the user's API keys
 * If keys are not available, provides an API endpoint for the user to submit their keys
 */
import axios from 'axios';
import { UtilityTool } from '../types/index.js';
import { registry } from '../registry/registry.js';
import {
  getStripeEnvironmentVariables,
  checkStripeApiKeys,
  generateAuthNeededResponse,
  getStripeApiKeys,
  formatStripeErrorResponse
} from './stripe-utils.js';

// Request parameters
interface StripeListCustomersRequest {
  limit?: number;
  starting_after?: string;
  ending_before?: string;
  email?: string;
  created?: {
    gt?: number;
    gte?: number;
    lt?: number;
    lte?: number;
  };
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
}

// Success response
interface StripeListCustomersSuccessResponse {
  success: true;
  count: number;
  customers: StripeCustomer[];
  has_more: boolean;
}

// Error response
interface StripeListCustomersErrorResponse {
  success: false;
  error: {
    message: string;
    type?: string;
    code?: string;
  };
}

// Combined response type
type StripeListCustomersResponse = StripeListCustomersSuccessResponse | StripeListCustomersErrorResponse;

/**
 * Implementation of the Stripe List Customers utility
 */
const stripeListCustomersUtility: UtilityTool = {
  id: 'utility_stripe_list_customers',
  description: 'List customers from Stripe',
  schema: {
    limit: {
      type: 'number',
      optional: true,
      description: 'Maximum number of customers to return (default: 10)'
    },
    starting_after: {
      type: 'string',
      optional: true,
      description: 'Cursor for pagination, customer ID to start after'
    },
    ending_before: {
      type: 'string',
      optional: true,
      description: 'Cursor for pagination, customer ID to end before'
    },
    email: {
      type: 'string',
      optional: true,
      description: 'Filter customers by exact email address'
    },
    created_after: {
      type: 'number',
      optional: true,
      description: 'Filter customers created after this timestamp'
    },
    created_before: {
      type: 'number',
      optional: true,
      description: 'Filter customers created before this timestamp'
    }
  },
  
  execute: async (userId: string, conversationId: string, params: StripeListCustomersRequest & { created_after?: number, created_before?: number }): Promise<StripeListCustomersResponse> => {
    try {
      // Extract parameters with defaults
      const { 
        limit = 10,
        starting_after,
        ending_before,
        email,
        created_after,
        created_before
      } = params || {};
      
      console.log(`💳 [STRIPE_LIST_CUSTOMERS] Listing customers for user: ${userId}`);
      
      // Get environment variables
      const { secretServiceUrl, apiGatewayUrl } = getStripeEnvironmentVariables();
      
      // Check if user has the required API keys
      const { exists } = await checkStripeApiKeys(userId, secretServiceUrl);
      
      // If we don't have the API keys, return auth needed response
      if (!exists) {
        return {
          success: false,
          error: {
            message: `Stripe API keys not found for user ${userId}. Please provide your Stripe API keys at ${apiGatewayUrl}/api/secrets/stripe.`
          }
        };
      }
      
      // Get the API keys
      const stripeKeys = await getStripeApiKeys(userId, secretServiceUrl);
      
      // Call the Stripe API with the secret key
      console.log(`💳 [STRIPE_LIST_CUSTOMERS] Calling Stripe API to list customers`);
      
      // Build query parameters
      const queryParams: any = {
        limit,
        starting_after: starting_after || undefined,
        ending_before: ending_before || undefined,
        email: email || undefined
      };
      
      // Add created filter if provided
      if (created_after || created_before) {
        queryParams.created = {};
        if (created_after) queryParams.created.gt = created_after;
        if (created_before) queryParams.created.lt = created_before;
      }
      
      const stripeResponse = await axios.get(
        'https://api.stripe.com/v1/customers',
        {
          params: queryParams,
          headers: {
            'Authorization': `Bearer ${stripeKeys.apiSecret}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      const customers = stripeResponse.data.data || [];
      
      // Map the Stripe customers to our customer format
      const mappedCustomers: StripeCustomer[] = customers.map((customer: any) => ({
        id: customer.id,
        email: customer.email,
        name: customer.name,
        phone: customer.phone,
        description: customer.description,
        created: customer.created,
        currency: customer.currency,
        default_source: customer.default_source,
        metadata: customer.metadata || {}
      }));
      
      // Return the customers
      const successResponse: StripeListCustomersSuccessResponse = {
        success: true,
        count: mappedCustomers.length,
        customers: mappedCustomers,
        has_more: stripeResponse.data.has_more || false
      };
      
      return successResponse;
    } catch (error) {
      console.error("❌ [STRIPE_LIST_CUSTOMERS] Error:", error);
      
      // Create a proper error response
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'An unknown error occurred',
          type: error.response?.data?.error?.type,
          code: error.response?.data?.error?.code
        }
      };
    }
  }
};

// Register the utility
registry.register(stripeListCustomersUtility);

// Export the utility
export default stripeListCustomersUtility; 