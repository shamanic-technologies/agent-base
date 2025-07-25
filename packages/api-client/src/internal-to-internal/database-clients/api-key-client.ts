/**
 * Typed API client functions for interacting with the Database Service API Key Endpoints.
 */
import { 
  ServiceResponse,
  ApiKey, // Use camelCase type for client consistency
  CreateApiKeyRequest,
  ValidateApiKeyRequest,
  ValidateApiKeyResult, // Response type for validation endpoint
  ApiKeyRecord
} from '@agent-base/types';
import { makeWebAuthenticatedServiceRequest } from '../../utils/service-client.js';
import { getDatabaseServiceUrl } from '../../utils/config.js'; // Import the centralized getter
import { Method } from 'axios';

// ==============================================================================
// API Key Client Functions
// ==============================================================================

/**
 * Creates API Key metadata.
 * 
 * Corresponds to: POST /api-keys/
 * 
 * @param data - Input data containing keyId, name, keyPrefix, hashedKey.
 * @param platformUserId - The platform user ID making the request (for headers).
 * @returns A ServiceResponse containing the created ApiKey object or an error.
 */
export const createApiKeyMetadata = async (
  data: CreateApiKeyRequest,
  platformUserId: string,
  platformOrganizationId: string
): Promise<ServiceResponse<ApiKey>> => {

  const endpoint = '/api-keys/';
  return makeWebAuthenticatedServiceRequest<ApiKey>(
    getDatabaseServiceUrl(),
    'POST',
    endpoint,
    platformUserId,
    platformOrganizationId,
    data
  );
};

/**
 * Gets the list of API Key metadata for the current user.
 * 
 * Corresponds to: GET /api-keys/
 * 
 * @param platformUserId - The platform user ID making the request (for headers).
 * @returns A ServiceResponse containing an array of ApiKey objects or an error.
 */
export const listApiKeyMetadata = async (
  platformUserId: string,
  platformOrganizationId: string
): Promise<ServiceResponse<ApiKey[]>> => {
  if (!platformUserId) {
    throw new Error('[api-client:listApiKeyMetadata] platformUserId is required for request header.');
  }
  const endpoint = '/api-keys/';
  return makeWebAuthenticatedServiceRequest<ApiKey[]>(
    getDatabaseServiceUrl(),
    'GET',
    endpoint,
    platformUserId,
    platformOrganizationId
    // No query params or body needed
  );
};

/**
 * Validates an API key and updates its last used timestamp.
 * Note: This endpoint does not require platformUserId in the header.
 * 
 * Corresponds to: POST /api-keys/validate
 * 
 * @param data - Input data containing hashedKey and keyPrefix.
 * @returns A ServiceResponse containing ValidateApiKeyResult (with keyId and userId/platformUserId) or an error.
 */
export const validateApiKey = async (
  data: ValidateApiKeyRequest
): Promise<ServiceResponse<ValidateApiKeyResult>> => {
  if (!data || !data.hashedKey || !data.keyPrefix) {
    throw new Error('[api-client:validateApiKey] Input data must include hashedKey and keyPrefix.');
  }
  const endpoint = '/api-keys/validate';
  // Pass an empty string or handle differently if platformUserId is truly not needed by makeServiceRequest
  // Assuming makeServiceRequest requires it, but it won't be used by this specific endpoint's backend logic.
  const placeholderUserId = ''; // Or adjust makeServiceRequest if possible
  const placeholderOrgId = ''; // Or adjust makeServiceRequest if possible
  return makeWebAuthenticatedServiceRequest<ValidateApiKeyResult>(
    getDatabaseServiceUrl(),
    'POST',
    endpoint,
    placeholderUserId, // Provide a placeholder or modify makeServiceRequest if necessary
    placeholderOrgId, // Provide a placeholder or modify makeServiceRequest if necessary
    data
  );
};

/**
 * Deletes API Key metadata.
 * 
 * Corresponds to: DELETE /api-keys/:keyId
 * 
 * @param keyId - The ID of the key to delete.
 * @param platformUserId - The platform user ID making the request (for headers).
 * @param platformOrganizationId - The platform organization ID making the request (for headers).
 * @returns A ServiceResponse containing a boolean success status or an error.
 */
export const deleteApiKeyMetadata = async (
  keyId: string,
  platformUserId: string,
  platformOrganizationId: string
): Promise<ServiceResponse<boolean>> => {
  if (!keyId) {
    throw new Error('[api-client:deleteApiKeyMetadata] keyId is required.');
  }
  const endpoint = `/api-keys/${keyId}`;
  return makeWebAuthenticatedServiceRequest<boolean>(
    getDatabaseServiceUrl(),
    'DELETE',
    endpoint,
    platformUserId,
    platformOrganizationId
  );
}; 