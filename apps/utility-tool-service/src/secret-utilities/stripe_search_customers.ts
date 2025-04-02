/**
 * Stripe Search Customers Utility
 * 
 * Searches customers from Stripe using the user's API keys and Stripe Search Query Language
 * If keys are not available, provides an API endpoint for the user to submit their keys
 */
import axios from 'axios';
import { UtilityTool } from '../types/index.js';
import { registry } from '../registry/registry.js';
import {
  getStripeEnvironmentVariables,
  checkStripeApiKeys,
  getStripeApiKeys
} from './stripe-utils.js';

// Request parameters
interface StripeSearchCustomersRequest {
  query: string;
  limit?: number;
  page?: string;
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
interface StripeSearchCustomersSuccessResponse {
  success: true;
  count: number;
  customers: StripeCustomer[];
  has_more: boolean;
  next_page?: string;
}

// Error response
interface StripeSearchCustomersErrorResponse {
  success: false;
  error: {
    message: string;
    type?: string;
    code?: string;
  };
}

// Combined response type
type StripeSearchCustomersResponse = StripeSearchCustomersSuccessResponse | StripeSearchCustomersErrorResponse;

/**
 * Implementation of the Stripe Search Customers utility
 */
const stripeSearchCustomersUtility: UtilityTool = {
  id: 'utility_stripe_search_customers',
  description: 'Search customers from Stripe using advanced query syntax',
  schema: {
    query: {
      type: 'string',
      optional: false,
      description: 'Search query in Stripe Query Language (e.g. "name:\'John\' OR email:\'john@example.com\'")'
    },
    limit: {
      type: 'number',
      optional: true,
      description: 'Maximum number of customers to return (default: 10, max: 100)'
    },
    page: {
      type: 'string',
      optional: true,
      description: 'Page token for pagination'
    }
  },
  
  execute: async (userId: string, conversationId: string, params: StripeSearchCustomersRequest): Promise<StripeSearchCustomersResponse> => {
    try {
      // Validate required parameters
      if (!params.query) {
        return {
          success: false,
          error: {
            message: 'Search query is required'
          }
        };
      }
      
      // Extract parameters with defaults
      const { 
        query,
        limit = 10,
        page
      } = params;
      
      console.log(`💳 [STRIPE_SEARCH_CUSTOMERS] Searching customers for user: ${userId} with query: ${query}`);
      
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
      console.log(`💳 [STRIPE_SEARCH_CUSTOMERS] Calling Stripe API to search customers`);
      
      // Build query parameters
      const queryParams: any = {
        query,
        limit,
        page
      };
      
      const stripeResponse = await axios.get(
        'https://api.stripe.com/v1/customers/search',
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
      const successResponse: StripeSearchCustomersSuccessResponse = {
        success: true,
        count: mappedCustomers.length,
        customers: mappedCustomers,
        has_more: stripeResponse.data.has_more || false
      };
      
      // Add next_page if available
      if (stripeResponse.data.next_page) {
        successResponse.next_page = stripeResponse.data.next_page;
      }
      
      return successResponse;
    } catch (error) {
      console.error("❌ [STRIPE_SEARCH_CUSTOMERS] Error:", error);
      
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
registry.register(stripeSearchCustomersUtility);

// Export the utility
export default stripeSearchCustomersUtility; 