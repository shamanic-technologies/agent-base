/**
 * Read Stripe API Keys Utility
 * 
 * Retrieves Stripe API keys securely from the Secret Service
 * Keys are fetched from Google Secret Manager but not exposed directly to the AI agent
 */
import axios from 'axios';
import { 
  UtilityTool, 
  StripeKeysReadRequest, 
  StripeKeysReadResponse,
  StripeKeysReadSuccessResponse,
  StripeKeysReadErrorResponse
} from '../types/index.js';
import { registry } from '../registry/registry.js';

/**
 * Implementation of the Read Stripe API Keys utility
 */
const readStripeApiKeysUtility: UtilityTool = {
  id: 'utility_read_stripe_api_keys',
  description: 'Check if user has already stored Stripe API keys',
  schema: {
    key_type: {
      type: 'string',
      optional: true,
      description: 'Type of keys to check (publishable_key, secret_key, or both)'
    }
  },
  
  execute: async (userId: string, conversationId: string, params: StripeKeysReadRequest): Promise<StripeKeysReadResponse> => {
    try {
      // Extract parameters with defaults
      const { key_type = 'both' } = params || {};
      
      console.log(`💳 [READ_STRIPE_KEYS] Checking Stripe API keys for user: ${userId}`);
      
      // Get secrets service URL with fallback
      const secretsServiceUrl = process.env.SECRETS_SERVICE_URL || 'http://localhost:3070';
      
      if (!secretsServiceUrl) {
        throw new Error('SECRETS_SERVICE_URL environment variable is not set');
      }
      
      // First, check if keys exist
      const checkResponse = await axios.post(
        `${secretsServiceUrl}/api/check-secret`,
        {
          userId,
          secretType: 'stripe_api_keys'
        }
      );
      
      // If keys don't exist, return that information
      if (!checkResponse.data.exists) {
        const response: StripeKeysReadSuccessResponse = {
          success: true,
          has_keys: false
        };
        return response;
      }
      
      // If keys exist, get them (but don't return the full secret key)
      const getResponse = await axios.post(
        `${secretsServiceUrl}/api/get-secret`,
        {
          userId,
          secretType: 'stripe_api_keys'
        }
      );
      
      if (!getResponse.data.success) {
        throw new Error(getResponse.data.error || 'Failed to retrieve Stripe API keys');
      }
      
      const stripeKeys = getResponse.data.data;
      
      // Only return what's needed based on key_type
      const response: StripeKeysReadSuccessResponse = {
        success: true,
        has_keys: true
      };
      
      if (key_type === 'publishable_key' || key_type === 'both') {
        response.publishable_key = stripeKeys.publishable_key;
      }
      
      if (key_type === 'secret_key' || key_type === 'both') {
        // Only return the last 4 characters of the secret key for verification
        const secretKey = stripeKeys.secret_key;
        if (secretKey && secretKey.length > 4) {
          response.secret_key_last_four = secretKey.slice(-4);
        }
      }
      
      return response;
    } catch (error) {
      console.error("❌ [READ_STRIPE_KEYS] Error:", error);
      
      const errorResponse: StripeKeysReadErrorResponse = {
        success: false,
        error: "Failed to read Stripe API keys",
        details: error instanceof Error ? error.message : String(error)
      };
      return errorResponse;
    }
  }
};

// Register the utility
registry.register(readStripeApiKeysUtility);

// Export the utility
export default readStripeApiKeysUtility;