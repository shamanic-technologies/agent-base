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
  getStripeApiKeys
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

// Combined response type
type StripeGetCustomerResponse = StripeGetCustomerSuccessResponse | StripeGetCustomerErrorResponse;

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
    try {
      // Validate required parameters
      if (!params.customer_id) {
        return {
          success: false,
          error: {
            message: 'Customer ID is required'
          }
        };
      }
      
      // Extract parameters
      const { 
        customer_id,
        expand = []
      } = params;
      
      console.log(`💳 [STRIPE_GET_CUSTOMER] Retrieving customer ${customer_id} for user: ${userId}`);
      
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
      console.log(`💳 [STRIPE_GET_CUSTOMER] Calling Stripe API to get customer ${customer_id}`);
      
      // Build query parameters to expand nested objects if requested
      const queryParams: any = {};
      
      // Add expand parameters
      if (expand && expand.length > 0) {
        queryParams.expand = expand.map(item => `${item === 'cards' ? 'sources' : item}`);
      }
      
      const stripeResponse = await axios.get(
        `https://api.stripe.com/v1/customers/${customer_id}`,
        {
          params: queryParams,
          headers: {
            'Authorization': `Bearer ${stripeKeys.apiSecret}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      const customer = stripeResponse.data;
      
      // Map the Stripe customer to our customer format
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
        balance: customer.balance !== undefined ? customer.balance / 100 : null, // Convert to dollars
        shipping: customer.shipping,
        discount: customer.discount
      };
      
      // Add expanded properties if they exist
      if (customer.subscriptions && customer.subscriptions.data) {
        mappedCustomer.subscriptions = customer.subscriptions.data;
      }
      
      if (customer.sources && customer.sources.data) {
        // Extract card data if present
        mappedCustomer.sources = customer.sources.data;
        
        // Extract cards for convenience
        const cards = customer.sources.data.filter((source: any) => source.object === 'card');
        if (cards.length > 0) {
          mappedCustomer.cards = cards;
        }
      }
      
      // Return the customer
      return {
        success: true,
        customer: mappedCustomer
      };
    } catch (error) {
      console.error("❌ [STRIPE_GET_CUSTOMER] Error:", error);
      
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
registry.register(stripeGetCustomerUtility);

// Export the utility
export default stripeGetCustomerUtility; 