/**
 * Typed API client functions for interacting with the Database Service OAuth Endpoints.
 */
import { 
  ServiceResponse,
  OAuth, // Use camelCase type for client consistency
  CreateOrUpdateOAuthInput,
  GetUserOAuthInput
} from '@agent-base/types';
import { makeWebAuthenticatedServiceRequest } from '../utils/service-client';
// Use the same base URL as defined elsewhere or manage centrally
const DATABASE_SERVICE_URL = process.env.DATABASE_SERVICE_URL || 'http://localhost:3006'; // Ensure consistency

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
  platformUserId: string
): Promise<ServiceResponse<OAuth>> => {
  if (!platformUserId) {
    throw new Error('[api-client:createOrUpdateOAuthCredentials] platformUserId is required for request header.');
  }
  // Add more specific validation based on CreateOrUpdateOAuthInput fields
  if (!data || !data.userId || !data.oauthProvider || !data.accessToken || !data.refreshToken || !data.expiresAt || !data.scopes) {
    throw new Error('[api-client:createOrUpdateOAuthCredentials] Input data is missing required fields.');
  }
  const endpoint = '/oauth/';
  return makeWebAuthenticatedServiceRequest<OAuth>(
    DATABASE_SERVICE_URL,
    'POST',
    endpoint,
    platformUserId,
    data
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
  platformUserId: string
): Promise<ServiceResponse<OAuth>> => {
  if (!platformUserId) {
    throw new Error('[api-client:getOAuthCredentials] platformUserId is required for request header.');
  }
  if (!params || !params.userId || !params.oauthProvider || !params.requiredScopes) {
    throw new Error('[api-client:getOAuthCredentials] Query parameters must include userId, oauthProvider, and requiredScopes.');
  }
  const endpoint = '/oauth/';
  return makeWebAuthenticatedServiceRequest<OAuth>(
    DATABASE_SERVICE_URL,
    'GET',
    endpoint,
    platformUserId,
    undefined, // No request body for GET
    params     // Pass params as query parameters
  );
}; 