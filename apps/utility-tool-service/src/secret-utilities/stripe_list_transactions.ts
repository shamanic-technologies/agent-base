/**
 * Stripe List Transactions Utility
 * 
 * Lists transactions from Stripe using the user's API keys
 * If keys are not available, provides a form URL for the user to enter their keys
 */
import axios from 'axios';
import { 
  UtilityTool, 
  StripeListTransactionsRequest, 
  StripeListTransactionsResponse,
  StripeAuthNeededResponse,
  StripeTransactionsSuccessResponse,
  StripeTransactionsErrorResponse,
  StripeTransaction
} from '../types/index.js';
import { registry } from '../registry/registry.js';

/**
 * Implementation of the Stripe List Transactions utility
 */
const stripeListTransactionsUtility: UtilityTool = {
  id: 'utility_stripe_list_transactions',
  description: 'List transactions from Stripe',
  schema: {
    limit: {
      type: 'number',
      optional: true,
      description: 'Maximum number of transactions to return (default: 10)'
    },
    starting_after: {
      type: 'string',
      optional: true,
      description: 'Cursor for pagination, transaction ID to start after'
    },
    ending_before: {
      type: 'string',
      optional: true,
      description: 'Cursor for pagination, transaction ID to end before'
    }
  },
  
  execute: async (userId: string, conversationId: string, params: StripeListTransactionsRequest): Promise<StripeListTransactionsResponse> => {
    try {
      // Extract parameters with defaults
      const { 
        limit = 10,
        starting_after,
        ending_before
      } = params || {};
      
      console.log(`💳 [STRIPE_LIST_TRANSACTIONS] Listing transactions for user: ${userId}`);
      
      // Get secrets service URL with fallback
      const secretsServiceUrl = process.env.SECRETS_SERVICE_URL;
      
      if (!secretsServiceUrl) {
        throw new Error('SECRETS_SERVICE_URL environment variable is not set');
      }
      
      // Check if user has the required API keys
      const checkResponse = await axios.post(
        `${secretsServiceUrl}/api/check-secret`,
        {
          userId,
          secretType: 'stripe'
        }
      );
      
      // If we don't have the API keys, return the form URL for the frontend to handle
      if (!checkResponse.data.exists) {
        // Build the form submission URL with query parameters
        const encodedDescription = encodeURIComponent('Your Stripe API keys are required to list transactions.');
        const formSubmitUrl = `${secretsServiceUrl}/stripe/form?userId=${userId}&conversationId=${conversationId}&description=${encodedDescription}`;
        
        console.log(`💳 [STRIPE_LIST_TRANSACTIONS] No API keys found, returning form URL: ${formSubmitUrl}`);
        
        const authNeededResponse: StripeAuthNeededResponse = {
          needs_auth: true,
          form_submit_url: formSubmitUrl,
          message: 'Stripe access requires API keys. Please enter your Stripe API keys in the provided form.'
        };
        return authNeededResponse;
      }
      
      // If we have the API keys, get them to use with Stripe API
      const getResponse = await axios.post(
        `${secretsServiceUrl}/api/get-secret`,
        {
          userId,
          secretType: 'stripe'
        }
      );
      
      if (!getResponse.data.success) {
        throw new Error(getResponse.data.error || 'Failed to retrieve Stripe API keys');
      }
      
      const stripeKeys = getResponse.data.data;
      
      if (!stripeKeys.apiKey) {
        throw new Error('Stripe API key is missing');
      }
      
      // Call the Stripe API with the secret key
      console.log(`💳 [STRIPE_LIST_TRANSACTIONS] Calling Stripe API to list transactions`);
      
      const stripeResponse = await axios.get(
        'https://api.stripe.com/v1/charges',
        {
          params: {
            limit,
            starting_after: starting_after || undefined,
            ending_before: ending_before || undefined
          },
          headers: {
            'Authorization': `Bearer ${stripeKeys.apiKey}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      const charges = stripeResponse.data.data || [];
      
      // Map the Stripe charges to our transaction format
      const transactions: StripeTransaction[] = charges.map((charge: any) => ({
        id: charge.id,
        amount: charge.amount / 100, // Convert from cents to dollars
        currency: charge.currency,
        description: charge.description || '',
        status: charge.status,
        created: charge.created,
        customer: charge.customer,
        metadata: charge.metadata
      }));
      
      // Return the transactions
      const successResponse: StripeTransactionsSuccessResponse = {
        success: true,
        count: transactions.length,
        transactions,
        has_more: stripeResponse.data.has_more || false
      };
      
      return successResponse;
    } catch (error) {
      console.error("❌ [STRIPE_LIST_TRANSACTIONS] Error:", error);
      
      // Check if this is a Stripe auth error
      if (error.response && error.response.status === 401) {
        const errorResponse: StripeTransactionsErrorResponse = {
          success: false,
          error: "Stripe authentication failed. Your API key may be invalid.",
          details: "Please verify your Stripe API key and try again."
        };
        return errorResponse;
      }
      
      const errorResponse: StripeTransactionsErrorResponse = {
        success: false,
        error: "Failed to list transactions from Stripe",
        details: error instanceof Error ? error.message : String(error)
      };
      return errorResponse;
    }
  }
};

// Register the utility
registry.register(stripeListTransactionsUtility);

// Export the utility
export default stripeListTransactionsUtility;
