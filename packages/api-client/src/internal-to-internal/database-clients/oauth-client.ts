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
  MinimalInternalCredentials
} from '@agent-base/types';
// Import the shared HTTP client utility
// import { makeServiceRequest } from '@agent-base/types'; // Old import
import { getDatabaseServiceUrl, makeMinimalInternalRequest } from '@agent-base/api-client'; // New import
  
// Re-export the types for convenience
export type { OAuth, CreateOrUpdateOAuthInput, ServiceResponse, GetUserOAuthInput };

/**
 * Create or update user credentials using the shared HTTP client utility.
 */
export async function createOrUpdateCredentials(
  input: CreateOrUpdateOAuthInput,
  minimalInternalCredentials: MinimalInternalCredentials
): Promise<ServiceResponse<void>> {

  // The correct endpoint is POST /oauth
  return makeMinimalInternalRequest<void>(
    getDatabaseServiceUrl(),
    'POST',
    '/oauth', // Corrected path
    minimalInternalCredentials,
    input,
    undefined,
  );
}


/**
 * Get user credentials by user ID using the shared HTTP client utility.
 */
export async function getCredentials(
  input: GetUserOAuthInput,
  minimalInternalCredentials: MinimalInternalCredentials
): Promise<ServiceResponse<OAuth[]>> {
  // Convert requiredScopes array to comma-separated string necesary for GET requests
  const params = {
    ...input,
    requiredScopes: input.requiredScopes.join(','),
  };

  // Use makeWebAnonymousServiceRequest for GET request, sending input as query parameters
  return makeMinimalInternalRequest<OAuth[]>(
    getDatabaseServiceUrl(),
    'GET',
    '/oauth',
    minimalInternalCredentials,
    undefined, // No request body (data)
    params // query parameters
  );
}
