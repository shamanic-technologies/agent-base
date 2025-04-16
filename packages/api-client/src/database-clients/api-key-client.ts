/**
 * Typed API client functions for interacting with the Database Service API Key Endpoints.
 */
import { 
  makeServiceRequest,
  ServiceResponse,
  ApiKey, // Use camelCase type for client consistency
  CreateApiKeyRequest,
  ValidateApiKeyRequest,
  ValidateApiKeyResponse // Response type for validation endpoint
} from '@agent-base/types';

// Use the same base URL as defined elsewhere or manage centrally
const DATABASE_SERVICE_URL = process.env.DATABASE_SERVICE_URL || 'http://localhost:3006'; // Ensure consistency

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
  platformUserId: string
): Promise<ServiceResponse<ApiKey>> => {
  if (!platformUserId) {
    throw new Error('[api-client:createApiKeyMetadata] platformUserId is required for request header.');
  }
  if (!data || !data.keyId || !data.name || !data.keyPrefix || !data.hashedKey) {
    throw new Error('[api-client:createApiKeyMetadata] Input data must include keyId, name, keyPrefix, and hashedKey.');
  }
  const endpoint = '/api-keys/';
  return makeServiceRequest<ApiKey>(
    DATABASE_SERVICE_URL,
    'POST',
    endpoint,
    platformUserId,
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
  platformUserId: string
): Promise<ServiceResponse<ApiKey[]>> => {
  if (!platformUserId) {
    throw new Error('[api-client:listApiKeyMetadata] platformUserId is required for request header.');
  }
  const endpoint = '/api-keys/';
  return makeServiceRequest<ApiKey[]>(
    DATABASE_SERVICE_URL,
    'GET',
    endpoint,
    platformUserId
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
 * @returns A ServiceResponse containing ValidateApiKeyResponse (with keyId and userId/platformUserId) or an error.
 */
export const validateApiKey = async (
  data: ValidateApiKeyRequest
): Promise<ServiceResponse<ValidateApiKeyResponse>> => {
  if (!data || !data.hashedKey || !data.keyPrefix) {
    throw new Error('[api-client:validateApiKey] Input data must include hashedKey and keyPrefix.');
  }
  const endpoint = '/api-keys/validate';
  // Pass an empty string or handle differently if platformUserId is truly not needed by makeServiceRequest
  // Assuming makeServiceRequest requires it, but it won't be used by this specific endpoint's backend logic.
  const placeholderUserId = ''; // Or adjust makeServiceRequest if possible
  return makeServiceRequest<ValidateApiKeyResponse>(
    DATABASE_SERVICE_URL,
    'POST',
    endpoint,
    placeholderUserId, // Provide a placeholder or modify makeServiceRequest if necessary
    data
  );
}; 