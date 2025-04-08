/**
 * Stripe Utilities
 * 
 * Shared functions for Stripe API operations
 */
import axios from 'axios';
import { SetupNeededResponse, UtilityErrorResponse } from '../types/index.js';
// import { StripeAuthNeededResponse } from '../types/index.js';

// --- Relocated Stripe Type Definitions ---

/**
 * Represents the parameters for requesting Stripe transactions.
 */
export interface StripeTransactionsRequest {
  limit?: number;
  starting_after?: string; // For pagination
  ending_before?: string; // For pagination
  type?: string; // e.g., 'charge', 'payment_intent'
  customer_id?: string;
}

/**
 * Represents a single Stripe transaction (charge, refund, etc.).
 * Fields should align with common properties from Stripe API objects.
 */
export interface StripeTransaction {
  id: string;
  object: string;
  amount: number;
  currency: string;
  created: string;
  status: string;
  description?: string | null;
  customer?: string | null;
  // Add other relevant fields as needed based on specific Stripe objects
  amount_captured?: number | null;
  amount_refunded?: number | null;
  net?: number | null;
  fee?: number | null;
}

/**
 * Represents a successful response when listing Stripe transactions.
 */
export interface StripeTransactionsSuccessResponse {
  status: 'success';
  count: number;
  has_more: boolean;
  data: StripeTransaction[];
}

/**
 * Union type representing all possible outcomes of a Stripe transaction-listing utility.
 */
export type StripeTransactionsResponse = 
  SetupNeededResponse | 
  StripeTransactionsSuccessResponse | 
  UtilityErrorResponse;

// --- End Relocated Stripe Type Definitions ---

/**
 * Stripe API key structure
 */
export interface StripeKeys {
  apiKey: string;    // Publishable key (pk_)
  apiSecret: string; // Secret key (sk_)
}

/**
 * Get and validate environment variables required for Stripe operations
 * @returns Object containing necessary service URLs
 * @throws Error if required environment variables are not set
 */
export function getStripeEnvironmentVariables(): { secretServiceUrl: string; apiGatewayUrl: string } {
  const secretServiceUrl = process.env.SECRET_SERVICE_URL;
  const apiGatewayUrl = process.env.API_GATEWAY_URL;
  
  if (!secretServiceUrl) {
    throw new Error('SECRET_SERVICE_URL environment variable is not set');
  }
  
  if (!apiGatewayUrl) {
    throw new Error('API_GATEWAY_URL environment variable is not set');
  }
  
  return { secretServiceUrl, apiGatewayUrl };
}

/**
 * Check if the user has Stripe API keys stored
 * @param userId User ID to check
 * @param secretServiceUrl Secret service URL
 * @returns Object with exists flag
 */
export async function checkStripeApiKeys(userId: string, secretServiceUrl: string): Promise<{ exists: boolean }> {
  const checkResponse = await axios.post(
    `${secretServiceUrl}/api/check-secret`,
    {
      userId,
      secretType: 'stripe_api_keys'
    }
  );
  
  return { exists: checkResponse.data.exists };
}

/**
 * Generate the response indicating that setup is needed
 * @param userId User ID for whom the setup is needed
 * @param conversationId Conversation ID for context
 * @param logPrefix Prefix for console logs
 * @returns SetupNeededResponse object
 */
export function generateSetupNeededResponse(
  userId: string, 
  conversationId: string,
  logPrefix: string
): SetupNeededResponse {
  
  const secretServiceBaseUrl = process.env.SECRET_SERVICE_URL;
  
  if (!secretServiceBaseUrl) {
    console.error(`${logPrefix} Error: SECRET_SERVICE_URL is not set. Cannot generate popup URL.`);
    // Consider returning a UtilityErrorResponse here instead of throwing
    // For consistency, let's return an error response:
    const errorResponse: UtilityErrorResponse = {
        status: 'error',
        error: 'Configuration error: SECRET_SERVICE_URL is not set'
    };
    // This function's signature currently returns SetupNeededResponse, 
    // so throwing might be necessary unless we change the signature or how it's used.
    // Sticking with throw for now based on original code, but flag for review.
    throw new Error('Configuration error: SECRET_SERVICE_URL is not set'); 
  }
  
  const setupUrl = `${secretServiceBaseUrl}/stripe/form?userId=${userId}&conversationId=${conversationId}`;
  console.log(`${logPrefix} Stripe keys not found, returning setup URL: ${setupUrl}`);
  
  // Return the standard SetupNeededResponse
  return {
    status: 'success',
    data: {
      needs_setup: true,
      setup_url: setupUrl,
      provider: "stripe",
      message: "Stripe API keys are required.",
      title: "Connect Stripe Account",
      description: "Your API keys are needed to access your Stripe data",
      button_text: "Connect Stripe Account"
    }
  };
}

/**
 * Retrieve Stripe API keys for a user
 * @param userId User ID
 * @param secretServiceUrl Secret service URL
 * @returns Object containing the API keys if successful
 * @throws Error if retrieval fails or keys are invalid
 */
export async function getStripeApiKeys(userId: string, secretServiceUrl: string): Promise<StripeKeys> {
  const getResponse = await axios.post(
    `${secretServiceUrl}/api/get-secret`,
    {
      userId,
      secretType: 'stripe_api_keys'
    }
  );
  
  if (!getResponse.data.success) {
    throw new Error(getResponse.data.error || 'Failed to retrieve Stripe API keys');
  }
  
  // Raw data retrieved from secret service (contains publishable_key and secret_key)
  const retrievedKeys = getResponse.data.data;
  
  // Validate the structure received from GSM
  if (!retrievedKeys || typeof retrievedKeys !== 'object') {
    throw new Error('Invalid data structure received for Stripe keys');
  }
  
  if (!retrievedKeys.secret_key) {
    throw new Error('Stripe secret_key is missing in the stored secret');
  }
  
  if (!retrievedKeys.publishable_key) {
    throw new Error('Stripe publishable_key is missing in the stored secret');
  }
  
  // Map the retrieved keys to the expected StripeKeys interface structure
  return {
    apiKey: retrievedKeys.publishable_key,
    apiSecret: retrievedKeys.secret_key
  };
}

/**
 * Format a Stripe API error response
 * @param error Error object from caught exception
 * @returns UtilityErrorResponse object
 */
export function formatStripeErrorResponse(error: any): UtilityErrorResponse {
  let responseError: string = "Failed to process Stripe operation";
  let responseDetails: string | undefined = undefined;
  
  if (axios.isAxiosError(error)) {
    if (error.response) {
      // Handle HTTP errors (like 401)
      if (error.response.status === 401) {
        responseError = "Stripe authentication failed. Your API key may be invalid.";
        responseDetails = "Please verify your Stripe API key and try again.";
      } else if (error.response.data && error.response.data.error) {
        // Handle specific Stripe API errors
        const stripeError = error.response.data.error;
        responseError = `Stripe API error: ${stripeError.type}`;
        responseDetails = stripeError.message || "An error occurred with the Stripe API";
      } else {
        // Other HTTP errors
        responseDetails = `HTTP error ${error.response.status}: ${error.response.statusText}`;
      }
    } else if (error.request) {
      // Request made but no response received
      responseError = "No response received from Stripe API";
      responseDetails = "Please check your network connection and Stripe's status.";
    } else {
      // Error setting up the request
      responseDetails = error.message;
    }
  } else if (error instanceof Error) {
    // Non-Axios errors
    responseDetails = error.message;
  } else {
    // Unknown error type
    responseDetails = String(error);
  }

  return {
    status: 'error',
    error: responseError,
    details: responseDetails
  };
}

// --- Stripe Key Management Types (Moved from types/index.ts) ---

/**
 * Stripe API keys request types (for creation/update)
 */
export interface StripeKeysRequest {
  key_type?: 'publishable_key' | 'secret_key' | 'both';
  description?: string;
}

export interface StripeKeysSuccessResponse {
  status: 'success'; 
  message: string;
  keys?: { 
    publishable_key?: string;
    secret_key?: string; 
  }
}

// Union response type for creating/updating keys
// Needs SetupNeededResponse and UtilityErrorResponse from ../types/index.js
export type StripeKeysResponse = SetupNeededResponse | StripeKeysSuccessResponse | UtilityErrorResponse;

/**
 * Stripe API keys read types
 */
export interface StripeKeysReadRequest {
  key_type?: 'publishable_key' | 'secret_key' | 'both';
}

export interface StripeKeysReadSuccessResponse {
  status: 'success'; 
  success?: true; // Consider removing redundant success field
  keys: {
    publishable_key?: string;
    secret_key?: string;
  };
}

// Union response type for reading keys
// Needs SetupNeededResponse and UtilityErrorResponse from ../types/index.js
export type StripeKeysReadResponse = SetupNeededResponse | StripeKeysReadSuccessResponse | UtilityErrorResponse;

// --- End Stripe Key Management Types --- 