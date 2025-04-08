/**
 * Stripe Get Customer Utility
 * 
 * Retrieves a specific customer from Stripe by ID using the user's API keys
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
 * Represents a successful response when fetching a Stripe customer.
 */
interface StripeGetCustomerSuccessResponse {
  status: 'success';
  customer_id: string;
  email?: string | null;
  name?: string | null;
  phone?: string | null;
  created: string;
  currency?: string | null;
  // Add other relevant customer fields from Stripe API
}

/**
 * Union type representing all possible outcomes of the Stripe get customer utility.
 */
type StripeGetCustomerResponse = 
  SetupNeededResponse | 
  StripeGetCustomerSuccessResponse | 
  UtilityErrorResponse;

/**
 * Request parameters for fetching a Stripe customer
 */
interface StripeGetCustomerParams {
  customer_id: string; // Required Stripe customer ID (cus_...)
}

// --- End Local Type Definitions ---

/**
 * Implementation of the Stripe Get Customer utility
 */
const stripeGetCustomerUtility: UtilityTool = {
  id: 'stripe_get_customer',
  description: 'Retrieves details for a specific Stripe customer by ID.',
  schema: {
    customer_id: { type: 'string', optional: false, description: 'The ID of the Stripe customer (e.g., cus_...).' }
  },
  
  execute: async (userId: string, conversationId: string, params: StripeGetCustomerParams): Promise<StripeGetCustomerResponse> => {
    const logPrefix = '👤 [STRIPE_GET_CUSTOMER]';
    try {
      // Validate required parameters
      if (!params?.customer_id) {
        console.error(`${logPrefix} Missing required parameter: customer_id`);
        return formatStripeErrorResponse({ message: 'Missing required parameter: customer_id.' });
      }
      
      const { customer_id } = params;
      
      console.log(`${logPrefix} Fetching customer: ${customer_id}, User: ${userId}`);
      
      // Get environment variables and keys (following the standard pattern)
      const { secretServiceUrl } = getStripeEnvironmentVariables();
      const { exists } = await checkStripeApiKeys(userId, secretServiceUrl);
      if (!exists) {
        return generateSetupNeededResponse(userId, conversationId, logPrefix);
      }
      const stripeKeys = await getStripeApiKeys(userId, secretServiceUrl);
      
      console.log(`${logPrefix} Calling Stripe API: GET /v1/customers/${customer_id}`);

      // Call the Stripe API to get the customer
      const stripeResponse = await axios.get(
        `https://api.stripe.com/v1/customers/${customer_id}`,
        {
          headers: {
            'Authorization': `Bearer ${stripeKeys.apiSecret}`,
            'Stripe-Version': '2024-04-10'
          }
        }
      );
      
      console.log(`${logPrefix} Stripe API response status: ${stripeResponse.status}`);
      const customer = stripeResponse.data;
      
      // Construct success response
      const successResponse: StripeGetCustomerSuccessResponse = {
        status: 'success',
        customer_id: customer.id,
        email: customer.email,
        name: customer.name,
        phone: customer.phone,
        created: new Date(customer.created * 1000).toISOString(),
        currency: customer.currency
        // Map other fields as needed
      };
      
      return successResponse;
      
    } catch (error: any) {
      console.error("❌ [STRIPE_GET_CUSTOMER] Error:", error);
      // Specific check for 404 Customer Not Found
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return formatStripeErrorResponse({ 
            message: `Stripe customer with ID '${params?.customer_id}' not found.`, 
            details: error.response?.data?.error?.message 
        });
      }
      return formatStripeErrorResponse(error);
    }
  }
};

// Register and Export
registry.register(stripeGetCustomerUtility);
export default stripeGetCustomerUtility; 