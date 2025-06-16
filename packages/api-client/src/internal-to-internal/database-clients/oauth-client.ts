/**
 * Typed API client functions for interacting with the Database Service OAuth Endpoints.
 */
import { 
  ServiceResponse,
  OAuth, // Use camelCase type for client consistency
  CreateOrUpdateOAuthInput,
  GetUserOAuthInput,
  MinimalInternalCredentials,
} from '@agent-base/types';
import { makeMinimalInternalRequest, makeWebAuthenticatedServiceRequest } from '../../utils/service-client.js';
import { getDatabaseServiceUrl } from '../../utils/config.js'; // Import the centralized getter
import { Method } from 'axios';

// ==============================================================================
// OAuth Client Functions
// ==============================================================================

/**
 * Creates or updates OAuth credentials for a user.
 * 
 * Corresponds to: POST /oauth/
 * 
 * @param data - Input data containing userId, provider, tokens, expiry, scopes.
 * @param platformUserId - The platform user ID making the request (for headers).
 * @returns A ServiceResponse containing the created/updated OAuth object or an error.
 */
export const createOrUpdateOAuthCredentials = async (
  data: CreateOrUpdateOAuthInput,
  minimalInternalCredentials: MinimalInternalCredentials
): Promise<ServiceResponse<OAuth>> => {

  const endpoint = '/oauth/';
  return makeMinimalInternalRequest<OAuth>(
    getDatabaseServiceUrl(),
    'POST',
    endpoint,
    minimalInternalCredentials,
    data,
    undefined
  );
};

/**
 * Gets OAuth credentials for a specific user and provider.
 * 
 * Corresponds to: GET /oauth/
 * 
 * @param params - Query parameters containing userId, oauthProvider, requiredScopes.
 * @param platformUserId - The platform user ID making the request (for headers).
 * @returns A ServiceResponse containing the OAuth object or an error.
 */
export const getOAuthCredentials = async (
  params: GetUserOAuthInput, // Using the existing input type directly for params
  minimalInternalCredentials: MinimalInternalCredentials
): Promise<ServiceResponse<OAuth>> => {

  const endpoint = '/oauth/';
  return makeMinimalInternalRequest<OAuth>(
    getDatabaseServiceUrl(),
    'GET',
    endpoint,
    minimalInternalCredentials,
    undefined, // No request body for GET
    params     // Pass params as query parameters
  );
}; 