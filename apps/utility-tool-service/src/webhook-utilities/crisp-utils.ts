/**
 * Crisp Utilities
 * 
 * Shared functions for Crisp API operations
 */
import axios from 'axios';

/**
 * Crisp webhook secret structure
 */
export interface CrispWebhookSecret {
  webhookSecret: string;
}

/**
 * Base Crisp API error response
 */
export interface CrispErrorResponse {
  success: false;
  error: string;
  details?: string;
}

/**
 * Get and validate environment variables required for Crisp operations
 * @returns Object containing necessary service URLs
 * @throws Error if required environment variables are not set
 */
export function getCrispEnvironmentVariables(): { secretServiceUrl: string; apiGatewayUrl: string } {
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
 * Check if the user has Crisp webhook secret stored
 * @param userId User ID to check
 * @param secretServiceUrl Secret service URL
 * @returns Object with exists flag
 */
export async function checkCrispWebhookSecret(userId: string, secretServiceUrl: string): Promise<{ exists: boolean }> {
  try {
    const response = await fetch(`${secretServiceUrl}/api/check-secret`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        secretType: 'crisp_webhook'
      })
    });
    
    const data = await response.json();
    return { exists: data.exists };
  } catch (error) {
    console.error("Failed to check if Crisp webhook secret exists:", error);
    return { exists: false };
  }
}

/**
 * Generate authentication needed response when webhook secret is missing
 * @param apiGatewayUrl API gateway URL
 * @param logPrefix Prefix for console logs
 * @returns Authentication needed response object
 */
export function generateAuthNeededResponse(
  apiGatewayUrl: string,
  logPrefix: string
): { needs_auth: boolean; auth_instructions: string; secret_type: string; message: string; form_submit_url: string } {
  // Create direct instructions for storing webhook secret
  const apiEndpoint = `${apiGatewayUrl}/secret/set_crisp_webhook_secret`;
  
  console.log(`${logPrefix} No webhook secret found. Client should store secret at: ${apiEndpoint}`);
  
  // Return updated response with form_submit_url to match existing patterns
  const authNeededResponse = {
    needs_auth: true,
    auth_instructions: 'Store your Crisp webhook secret using the form below',
    secret_type: 'crisp_webhook',
    message: 'Crisp webhook verification requires a webhook secret. Please provide your Crisp webhook secret to continue.',
    form_submit_url: apiEndpoint
  };
  
  return authNeededResponse;
}

/**
 * Retrieve Crisp webhook secret for a user
 * @param userId User ID
 * @param secretServiceUrl Secret service URL
 * @returns Object containing the webhook secret if successful
 * @throws Error if retrieval fails or secret is invalid
 */
export async function getCrispWebhookSecret(userId: string, secretServiceUrl: string): Promise<CrispWebhookSecret> {
  try {
    const response = await fetch(`${secretServiceUrl}/api/get-secret`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        secretType: 'crisp_webhook'
      })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to retrieve Crisp webhook secret');
    }
    
    const crispSecret = data.data;
    
    if (!crispSecret.webhookSecret) {
      throw new Error('Crisp webhook secret is missing');
    }
    
    return crispSecret;
  } catch (error) {
    console.error("Failed to get Crisp webhook secret:", error);
    throw error;
  }
}

/**
 * Format a Crisp API error response
 * @param error Error object from caught exception
 * @returns Formatted error response
 */
export function formatCrispErrorResponse(error: any): CrispErrorResponse {
  // Check if this is a Crisp auth error
  if (error.response && error.response.status === 401) {
    return {
      success: false,
      error: "Crisp authentication failed. Your webhook secret may be invalid.",
      details: "Please verify your Crisp webhook secret and try again."
    };
  }
  
  // Check for Crisp API errors and extract meaningful messages
  if (error.response && error.response.data && error.response.data.error) {
    const crispError = error.response.data.error;
    return {
      success: false,
      error: `Crisp API error: ${crispError.reason || crispError.type}`,
      details: crispError.message || "An error occurred with the Crisp API"
    };
  }
  
  // Default error response
  return {
    success: false,
    error: "Failed to process Crisp operation",
    details: error instanceof Error ? error.message : String(error)
  };
} 