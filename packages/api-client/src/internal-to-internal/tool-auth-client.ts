/**
 * Database Service Client
 * 
 * Handles all interactions with the database service
 */
import {
    OAuth, 
    CreateOrUpdateOAuthInput,
    ServiceResponse,
    GetUserOAuthInput,
    InternalCredentials,
    HumanInternalCredentials,
  } from '@agent-base/types';
  // Import the shared HTTP client utility
  // import { makeServiceRequest } from '@agent-base/types'; // Old import
import { getDatabaseServiceUrl, makeInternalRequest } from '@agent-base/api-client'; // New import
    
  // Re-export the types for convenience
  export type { OAuth, CreateOrUpdateOAuthInput, ServiceResponse, GetUserOAuthInput };
  
  /**
   * Create or update user credentials using the shared HTTP client utility.
   */
  export async function createOrUpdateCredentials(
    input: CreateOrUpdateOAuthInput,
    internalCredentials: HumanInternalCredentials
  ): Promise<ServiceResponse<void>> {

    // The correct endpoint is POST /oauth
    return makeInternalRequest<void>(
      getDatabaseServiceUrl(),
      'POST',
      '/oauth', // Corrected path
      internalCredentials.platformUserId,
      internalCredentials.clientUserId,
      internalCredentials.clientOrganizationId,
      internalCredentials.platformApiKey,
      input, // Send input as the request body (data)
      undefined, // No query parameters
      internalCredentials.agentId
    );
  }

  
  /**
   * Get user credentials by user ID using the shared HTTP client utility.
   */
  export async function getCredentials(
    input: GetUserOAuthInput,
    internalCredentials: HumanInternalCredentials
  ): Promise<ServiceResponse<OAuth[]>> {

    // Create a new params object to avoid mutating the original input
    const params = {
      ...input,
      requiredScopes: input.requiredScopes.join(','),
    };
  
    // Use makeWebAnonymousServiceRequest for GET request, sending input as query parameters
    return makeInternalRequest<OAuth[]>(
      getDatabaseServiceUrl(),
      'GET',
      '/oauth',
      internalCredentials.platformUserId,
      internalCredentials.clientUserId,
      internalCredentials.clientOrganizationId,
      internalCredentials.platformApiKey,
      undefined, // No request body (data)
      params // Send modified params with comma-separated scopes
    );
  }
  