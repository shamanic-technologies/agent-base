/**
 * Crisp Utilities
 * 
 * Shared functions for Crisp API operations
 */
import axios from 'axios';
import { SetupNeededResponse } from '../types/index.js';

/**
 * Crisp website details structure
 */
export interface CrispWebsiteDetails {
  websiteId: string;
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
 * Check if the user has Crisp website ID stored
 * @param userId User ID to check
 * @param secretServiceUrl Secret service URL
 * @returns Object with exists flag
 */
export async function checkCrispWebsiteId(userId: string, secretServiceUrl: string): Promise<{ exists: boolean }> {
  try {
    const response = await fetch(`${secretServiceUrl}/api/check-secret`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        secretType: 'crisp_website_id'
      })
    });
    
    const data = await response.json();
    return { exists: data.exists };
  } catch (error) {
    console.error("Failed to check if Crisp website ID exists:", error);
    return { exists: false };
  }
}

/**
 * Generate setup needed response when Crisp website ID is missing
 * @param apiGatewayUrl API gateway URL
 * @param logPrefix Prefix for console logs
 * @returns Setup needed response object
 */
export function generateSetupNeededResponse(
  apiGatewayUrl: string,
  logPrefix: string
): SetupNeededResponse {
  // Create direct instructions for storing website ID
  const setupUrl = `${apiGatewayUrl}/secret/set_crisp_website_id`;
  
  console.log(`${logPrefix} No Crisp website ID found. Client should set up Crisp integration at: ${setupUrl}`);
  
  // Return standardized SetupNeededResponse
  return {
    status: 'success',
    data: {
      needs_setup: true,
      setup_url: setupUrl,
      provider: "crisp",
      message: "Crisp webhook setup is required.",
      title: "Connect Crisp Account",
      description: "Your webhook setup is needed to subscribe to Crisp webhook events",
      button_text: "Connect Crisp Account"
    }
  };
}

/**
 * Retrieve Crisp website ID for a user
 * @param userId User ID
 * @param secretServiceUrl Secret service URL
 * @returns Object containing the website ID if successful
 * @throws Error if retrieval fails or ID is invalid
 */
export async function getCrispWebsiteId(userId: string, secretServiceUrl: string): Promise<CrispWebsiteDetails> {
  try {
    const response = await fetch(`${secretServiceUrl}/api/get-secret`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        secretType: 'crisp_website_id'
      })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to retrieve Crisp website ID');
    }
    
    const crispDetails = data.data;
    
    if (!crispDetails.websiteId) {
      throw new Error('Crisp website ID is missing');
    }
    
    return crispDetails;
  } catch (error) {
    console.error("Failed to get Crisp website ID:", error);
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
      error: "Crisp authentication failed. Your website ID may be invalid.",
      details: "Please verify your Crisp website ID and try again."
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