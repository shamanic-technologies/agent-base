/**
 * API Client for interacting with the Secret Service
 */
import { 
  ServiceResponse, 
  StoreSecretRequest,
  SecretValue,
  GetSecretRequest,
  SecretExists,
  CheckSecretRequest,
} from '@agent-base/types';
import { makeWebAuthenticatedServiceRequest, makeInternalRequest } from '../utils/service-client.js';
import { getSecretServiceUrl } from '../utils/config.js'; // Import the centralized getter

// Determine the correct URL for the secret-service
// Removed top-level constant: const SECRET_SERVICE_URL = ...

/**
 * Stores a secret via the secret service.
 * 
 * @param platformUserId The ID used for authentication header (value for x-platform-user-id or x-client-user-id).
 * @param storeSecretRequest The request body containing userType, userId, secretType, and secretValue.
 * @returns ServiceResponse containing a success message or error.
 */
export async function storeSecretWebClient(
  platformUserId: string, // This ID value will be placed in the header determined by storeSecretRequest.userType
  storeSecretRequest: StoreSecretRequest
): Promise<ServiceResponse<string>> {
  // storeSecretHandler in secret-service expects the full StoreSecretRequest in the body
  // and the path to be simply /api/secrets.
  return await makeWebAuthenticatedServiceRequest<string>(
    getSecretServiceUrl(), // Use dynamic getter
    'post',
    '/api/secrets', // Endpoint for storing secrets
    platformUserId, // ID value for the header (x-platform-user-id)
    storeSecretRequest, // Request body (data)
    undefined // No query parameters (params)
  );
}

/**
 * Stores a secret via the secret service using API key authentication.
 * 
 * @param storeSecretRequest The request body containing userType, userId, secretType, and secretValue.
 * @param platformUserId The platform user ID (for x-platform-user-id header).
 * @param platformApiKey The platform API key (for x-platform-api-key header).
 * @param clientUserId The client user ID (for x-client-user-id header).
 * @param clientOrganizationId The client organization ID (for x-client-organization-id header).
 * @returns ServiceResponse containing a success message or error.
 */
export async function storeSecretInternalApiClient(
  storeSecretRequest: StoreSecretRequest,
  platformUserId: string,
  platformApiKey: string,
  clientUserId: string,
  clientOrganizationId: string
): Promise<ServiceResponse<string>> {

  // POST requests send data in the body.
  return await makeInternalRequest<string>(
    getSecretServiceUrl(), // Use dynamic getter
    'post',
    '/api/secrets', // Endpoint for storing secrets
    platformUserId, // ID value for x-platform-user-id header
    clientUserId,   // ID value for x-client-user-id header
    clientOrganizationId, // ID value for x-client-organization-id header
    platformApiKey, // API key for x-platform-api-key header
    storeSecretRequest, // Request body (data)
    undefined // No query parameters (params)
  );
}

/**
 * Retrieves a secret via the secret service.
 * 
 * @param platformUserId The ID used for authentication header (value for x-platform-user-id or x-client-user-id).
 * @param getSecretRequest The request details containing userType, userId, and secretType.
 * @returns ServiceResponse containing the secret value or error.
 */
export async function getSecretWebClient(
  platformUserId: string, // This ID value will be placed in the header determined by getSecretRequest.userType
  getSecretRequest: GetSecretRequest
): Promise<ServiceResponse<SecretValue>> {
  const { userType, secretUtilityProvider, secretType } = getSecretRequest; // Include userId
  // GET requests use path params and query params. userType goes in query. userId is implicit via header.
  return await makeWebAuthenticatedServiceRequest<SecretValue>(
    getSecretServiceUrl(), // Use dynamic getter
    'get',
    `/api/secrets/${secretType}`, // Endpoint with path param
    platformUserId, // ID value for header (x-platform-user-id)
    undefined, // No request body (data) for GET
    { userType, secretUtilityProvider } // Query parameters (params)
  );
}

/**
 * Retrieves a secret via the secret service using API key authentication.
 * 
 * @param getSecretRequest The request details containing userType, userId, and secretType.
 * @param platformUserId The platform user ID (for x-platform-user-id header).
 * @param platformApiKey The platform API key (for x-platform-api-key header).
 * @param clientUserId The client user ID (for x-client-user-id header).
 * @param clientOrganizationId The client organization ID (for x-client-organization-id header).
 * @returns ServiceResponse containing the secret value or error.
 */
export async function getSecretApiClient(
  getSecretRequest: GetSecretRequest,
  platformUserId: string,
  platformApiKey: string,
  clientUserId: string,
  clientOrganizationId: string
): Promise<ServiceResponse<SecretValue>> {
  const { userType, secretUtilityProvider, secretType } = getSecretRequest; // Include userId

  // GET requests use path params and query params. userType goes in query. userId is implicit via headers.
  return await makeInternalRequest<SecretValue>(
    getSecretServiceUrl(), // Use dynamic getter
    'get',
    `/api/secrets/${secretType}`, // Endpoint with path param
    platformUserId, // ID value for x-platform-user-id header
    clientUserId,   // ID value for x-client-user-id header
    clientOrganizationId, // ID value for x-client-organization-id header
    platformApiKey, // API key for x-platform-api-key header
    undefined,      // No request body (data) for GET
    { userType, secretUtilityProvider } // Query parameters (params)
  );
}

/**
 * Checks if a secret exists via the secret service.
 * 
 * @param platformUserId The ID used for authentication header (value for x-platform-user-id or x-client-user-id).
 * @param checkSecretRequest The request details containing userType, userId, and secretType.
 * @returns ServiceResponse containing boolean existence status or error.
 */
export async function checkSecretExistsWebClient(
  platformUserId: string, // This ID value will be placed in the header determined by checkSecretRequest.userType
  checkSecretRequest: CheckSecretRequest
): Promise<ServiceResponse<SecretExists>> {
  const { userType, secretUtilityProvider, secretType } = checkSecretRequest; // Include userId

  // GET requests use path params and query params. userType goes in query. userId is implicit via header.
  return await makeWebAuthenticatedServiceRequest<SecretExists>(
    getSecretServiceUrl(), // Use dynamic getter
    'get',
    `/api/secrets/exists/${secretType}`, // Endpoint with path param
    platformUserId, // ID value for header (x-platform-user-id)
    undefined, // No request body (data) for GET
    { userType, secretUtilityProvider } // Query parameters (params)
  );
} 

/**
 * Checks if a secret exists via the secret service using API key authentication.
 * 
 * @param checkSecretRequest The request details containing userType, userId, and secretType.
 * @param platformUserId The platform user ID (for x-platform-user-id header).
 * @param platformApiKey The platform API key (for x-platform-api-key header).
 * @param clientUserId The client user ID (for x-client-user-id header).
 * @param clientOrganizationId The client organization ID (for x-client-organization-id header).
 * @returns ServiceResponse containing boolean existence status or error.
 */
export async function checkSecretExistsApiClient(
  checkSecretRequest: CheckSecretRequest,
  platformUserId: string,
  platformApiKey: string,
  clientUserId: string,
  clientOrganizationId: string
): Promise<ServiceResponse<SecretExists>> {
  const { userType, secretUtilityProvider, secretType } = checkSecretRequest; // Include userId

  // GET requests use path params and query params. userType goes in query. userId is implicit via headers.
  return await makeInternalRequest<SecretExists>(
    getSecretServiceUrl(), // Use dynamic getter
    'get',
    `/api/secrets/exists/${secretType}`, // Endpoint with path param
    platformUserId, // ID value for x-platform-user-id header
    clientUserId,   // ID value for x-client-user-id header
    clientOrganizationId, // ID value for x-client-organization-id header
    platformApiKey, // API key for x-platform-api-key header
    undefined,      // No request body (data) for GET
    { userType, secretUtilityProvider } // Query parameters (params)
  );
} 