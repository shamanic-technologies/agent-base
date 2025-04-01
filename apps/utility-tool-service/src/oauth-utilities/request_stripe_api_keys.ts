/**
 * Request Stripe API Keys Utility
 * 
 * Provides an iframe URL for users to securely input their Stripe API keys
 * Keys are stored in Google Secret Manager via the Secret Service
 */
import { 
  UtilityTool, 
  StripeKeysRequest, 
  StripeKeysResponse,
  StripeKeysIframeResponse,
  StripeKeysErrorResponse
} from '../types/index.js';
import { registry } from '../registry/registry.js';

/**
 * Implementation of the Request Stripe API Keys utility
 */
const requestStripeApiKeysUtility: UtilityTool = {
  id: 'utility_request_stripe_api_keys',
  description: 'Request user to input their Stripe API keys via a secure iframe',
  schema: {
    key_type: {
      type: 'string',
      optional: true,
      description: 'Type of keys to request (publishable_key, secret_key, or both)'
    },
    description: {
      type: 'string',
      optional: true,
      description: 'Description to show to the user explaining why the keys are needed'
    }
  },
  
  execute: async (userId: string, conversationId: string, params: StripeKeysRequest): Promise<StripeKeysResponse> => {
    try {
      // Extract parameters with defaults
      const { 
        key_type = 'both',
        description = 'Your Stripe API keys are needed to perform operations with your Stripe account.'
      } = params || {};
      
      console.log(`💳 [REQUEST_STRIPE_KEYS] Generating iframe URL for user: ${userId}`);
      
      // Get secrets service URL with fallback
      const secretsServiceUrl = process.env.SECRETS_SERVICE_URL || 'http://localhost:3070';
      
      if (!secretsServiceUrl) {
        throw new Error('SECRETS_SERVICE_URL environment variable is not set');
      }
      
      // Build iframe URL with query parameters
      const encodedDescription = encodeURIComponent(description);
      const iframeUrl = `${secretsServiceUrl}/stripe/form?userId=${userId}&conversationId=${conversationId}&keyType=${key_type}&description=${encodedDescription}`;
      
      console.log(`💳 [REQUEST_STRIPE_KEYS] Generated iframe URL: ${iframeUrl}`);
      
      // Return a response with the iframe URL
      const response: StripeKeysIframeResponse = {
        iframe_url: iframeUrl,
        message: 'Please input your Stripe API keys in the provided form.'
      };
      
      return response;
    } catch (error) {
      console.error("❌ [REQUEST_STRIPE_KEYS] Error:", error);
      
      const errorResponse: StripeKeysErrorResponse = {
        error: "Failed to generate Stripe API keys form",
        details: error instanceof Error ? error.message : String(error)
      };
      return errorResponse;
    }
  }
};

// Register the utility
registry.register(requestStripeApiKeysUtility);

// Export the utility
export default requestStripeApiKeysUtility; 