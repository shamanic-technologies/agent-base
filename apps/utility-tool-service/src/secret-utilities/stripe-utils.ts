/**
 * Stripe Utilities
 * 
 * Shared functions for Stripe API operations
 */
import axios from 'axios';
import { StripeAuthNeededResponse } from '../types/index.js';

/**
 * Stripe API key structure
 */
export interface StripeKeys {
  apiKey: string;    // Publishable key (pk_)
  apiSecret: string; // Secret key (sk_)
}

/**
 * Base Stripe API error response
 */
export interface StripeErrorResponse {
  success: false;
  error: string;
  details?: string;
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
      secretType: 'stripe'
    }
  );
  
  return { exists: checkResponse.data.exists };
}

/**
 * Generate authentication needed response when API keys are missing
 * @param userId User ID requesting the operation
 * @param conversationId Conversation ID for the request
 * @param apiGatewayUrl API gateway URL
 * @param logPrefix Prefix for console logs
 * @returns Authentication needed response object
 */
export function generateAuthNeededResponse(
  apiGatewayUrl: string,
  logPrefix: string
): StripeAuthNeededResponse {
  // Create the API endpoint URL that the client should call with their API key authentication
  const apiEndpoint = `${apiGatewayUrl}/secret/set_stripe_api_keys`;
  
  console.log(`${logPrefix} No API keys found, returning API gateway endpoint: ${apiEndpoint}`);
  
  const authNeededResponse: StripeAuthNeededResponse = {
    needs_auth: true,
    form_submit_url: apiEndpoint, // Use this existing field for API endpoint URL
    message: 'Stripe access requires API keys. Please submit your Stripe API keys to the provided endpoint using your API key for authentication.'
  };
  
  return authNeededResponse;
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
      secretType: 'stripe'
    }
  );
  
  if (!getResponse.data.success) {
    throw new Error(getResponse.data.error || 'Failed to retrieve Stripe API keys');
  }
  
  const stripeKeys = getResponse.data.data;
  
  if (!stripeKeys.apiSecret) {
    throw new Error('Stripe API secret is missing');
  }
  
  return stripeKeys;
}

/**
 * Format a Stripe API error response
 * @param error Error object from caught exception
 * @returns Formatted error response
 */
export function formatStripeErrorResponse(error: any): StripeErrorResponse {
  // Check if this is a Stripe auth error
  if (error.response && error.response.status === 401) {
    return {
      success: false,
      error: "Stripe authentication failed. Your API key may be invalid.",
      details: "Please verify your Stripe API key and try again."
    };
  }
  
  // Check for Stripe API errors and extract meaningful messages
  if (error.response && error.response.data && error.response.data.error) {
    const stripeError = error.response.data.error;
    return {
      success: false,
      error: `Stripe API error: ${stripeError.type}`,
      details: stripeError.message || "An error occurred with the Stripe API"
    };
  }
  
  // Default error response
  return {
    success: false,
    error: "Failed to process Stripe operation",
    details: error instanceof Error ? error.message : String(error)
  };
} 