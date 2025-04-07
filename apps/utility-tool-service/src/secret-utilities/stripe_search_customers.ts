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
  generateSetupNeededResponse,
  getStripeApiKeys,
  formatStripeErrorResponse
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
type StripeSearchCustomersResponse = StripeSearchCustomersSuccessResponse | StripeSearchCustomersErrorResponse | SetupNeededResponse;

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
    const logPrefix = '💳 [STRIPE_SEARCH_CUSTOMERS]';
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
      
      console.log(`${logPrefix} Searching customers for user: ${userId}`);
      
      // Get environment variables
      const { secretServiceUrl } = getStripeEnvironmentVariables();
      
      // Check if user has the required API keys
      const { exists } = await checkStripeApiKeys(userId, secretServiceUrl);
      
      if (!exists) {
        return generateSetupNeededResponse(userId, conversationId, logPrefix);
      }
      
      // Get the API keys
      const stripeKeys = await getStripeApiKeys(userId, secretServiceUrl);
      
      // Call the Stripe API with the secret key
      console.log(`${logPrefix} Calling Stripe API`);
      
      // Use standard axios.get
      const stripeResponse = await axios.get(
        'https://api.stripe.com/v1/customers/search',
        {
          params: {
            query,
            limit,
            page,
          },
          headers: {
            'Authorization': `Bearer ${stripeKeys.apiSecret}`,
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