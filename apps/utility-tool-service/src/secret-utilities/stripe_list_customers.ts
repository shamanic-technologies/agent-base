/**
 * Stripe List Customers Utility
 * 
 * Lists customers from Stripe using the user's API keys
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
 * Represents a single customer object returned by Stripe list/search.
 */
interface StripeCustomerSummary {
  id: string;
  email?: string | null;
  name?: string | null;
  phone?: string | null;
  created: string;
  currency?: string | null;
  description?: string | null;
  // Add other summary fields if needed
}

/**
 * Represents a successful response when listing Stripe customers.
 */
interface StripeListCustomersSuccessResponse {
  status: 'success';
  count: number;
  has_more: boolean;
  data: StripeCustomerSummary[];
}

/**
 * Union type representing all possible outcomes of the list customers utility.
 */
type StripeListCustomersResponse = 
  SetupNeededResponse | 
  StripeListCustomersSuccessResponse | 
  UtilityErrorResponse;

/**
 * Request parameters for listing Stripe customers
 */
interface StripeListCustomersParams {
  limit?: number;
  email?: string;
  starting_after?: string;
  ending_before?: string;
  // Add other relevant list parameters from Stripe API if needed
}

// --- End Local Type Definitions ---

/**
 * Implementation of the Stripe List Customers utility
 */
const stripeListCustomersUtility: UtilityTool = {
  id: 'stripe_list_customers',
  description: 'Lists customers in Stripe, optionally filtered by email or other criteria.',
  schema: {
    limit: { type: 'number', optional: true, description: 'Maximum number of customers to return (1-100, default 10).' },
    email: { type: 'string', optional: true, description: 'Filter customers by email address.' },
    starting_after: { type: 'string', optional: true, description: 'Cursor for pagination (customer ID).' },
    ending_before: { type: 'string', optional: true, description: 'Cursor for pagination (customer ID).' },
  },
  
  execute: async (userId: string, conversationId: string, params: StripeListCustomersParams): Promise<StripeListCustomersResponse> => {
    const logPrefix = '👥 [STRIPE_LIST_CUSTOMERS]';
    try {
      const { 
        limit = 10,
        email,
        starting_after,
        ending_before 
      } = params || {};
      
      console.log(`${logPrefix} Listing customers for user: ${userId}, Filter: ${email ? `email=${email}` : 'none'}`);
      
      // Get environment variables and keys
      const { secretServiceUrl } = getStripeEnvironmentVariables();
      const { exists } = await checkStripeApiKeys(userId, secretServiceUrl);
      if (!exists) {
        return generateSetupNeededResponse(userId, conversationId, logPrefix);
      }
      const stripeKeys = await getStripeApiKeys(userId, secretServiceUrl);
      
      // Construct query parameters
      const queryParams: any = { limit: Math.min(limit, 100) };
      if (email) queryParams.email = email;
      if (starting_after) queryParams.starting_after = starting_after;
      if (ending_before) queryParams.ending_before = ending_before;
      
      console.log(`${logPrefix} Calling Stripe API: GET /v1/customers with params:`, queryParams);

      // Call the Stripe API
      const stripeResponse = await axios.get(
        `https://api.stripe.com/v1/customers`,
        {
          params: queryParams,
          headers: {
            'Authorization': `Bearer ${stripeKeys.apiSecret}`,
            'Stripe-Version': '2024-04-10'
          }
        }
      );
      
      console.log(`${logPrefix} Stripe API response status: ${stripeResponse.status}`);
      const customers = stripeResponse.data.data || [];
      
      // Map response to summary format
      const customerSummaries = customers.map((cust: any): StripeCustomerSummary => ({
        id: cust.id,
        email: cust.email,
        name: cust.name,
        phone: cust.phone,
        created: new Date(cust.created * 1000).toISOString(),
        currency: cust.currency,
        description: cust.description
      }));
      
      // Construct success response
      const successResponse: StripeListCustomersSuccessResponse = {
        status: 'success',
        count: customerSummaries.length,
        has_more: stripeResponse.data.has_more,
        data: customerSummaries
      };
      
      return successResponse;
      
    } catch (error: any) {
      console.error("❌ [STRIPE_LIST_CUSTOMERS] Error:", error);
      return formatStripeErrorResponse(error);
    }
  }
};

// Register and Export
registry.register(stripeListCustomersUtility);
export default stripeListCustomersUtility; 