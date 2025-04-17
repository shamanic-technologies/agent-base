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
  UserType // Import UserType
} from '@agent-base/types';
import { makeWebAuthenticatedServiceRequest, makeAPIServiceRequest } from './utils/service-client.js';

// Determine the correct URL for the secret-service
const SECRET_SERVICE_URL = process.env.SECRET_SERVICE_URL || 'http://localhost:3070';
  
if (!process.env.SECRET_SERVICE_URL) {
  console.warn('[api-client] SECRET_SERVICE_URL environment variable not set. Defaulting to http://localhost:3070');
}

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

  // POST requests send data in the body.
  return await makeWebAuthenticatedServiceRequest<string>(
    SECRET_SERVICE_URL,
    'post',
    '/api/secrets', // Endpoint for storing secrets
    platformUserId, // ID value for the header
    storeSecretRequest.userType, // UserType to determine WHICH header to set
    storeSecretRequest // Request body
  );
}

/**
 * Stores a secret via the secret service.
 * 
 * @param platformUserId The ID used for authentication header (value for x-platform-user-id or x-client-user-id).
 * @param storeSecretRequest The request body containing userType, userId, secretType, and secretValue.
 * @returns ServiceResponse containing a success message or error.
 */
export async function storeSecretApiClient(
  storeSecretRequest: StoreSecretRequest,
  platformUserId: string,
  platformApiKey: string,
  clientUserId: string
): Promise<ServiceResponse<string>> {

  // POST requests send data in the body.
  return await makeAPIServiceRequest<string>(
    SECRET_SERVICE_URL,
    'post',
    '/api/secrets', // Endpoint for storing secrets
    platformUserId, // ID value for the header
    clientUserId,
    platformApiKey,
    storeSecretRequest.userType, // UserType to determine WHICH header to set
    storeSecretRequest // Request body
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
  const { userType, secretType } = getSecretRequest;
  const userTypeStr = userType === UserType.Platform ? 'platform' : 'client';

  // GET requests use path params and query params.
  return await makeWebAuthenticatedServiceRequest<SecretValue>(
    SECRET_SERVICE_URL,
    'get',
    `/api/secrets/${secretType}?userType=${userTypeStr}`, // Endpoint with path and query params
    platformUserId, // ID value for the header
    userType, // UserType to determine WHICH header to set
    undefined // No request body for GET
    // Query parameters are now part of the URL path
  );
}

/**
 * Retrieves a secret via the secret service.
 * 
 * @param platformUserId The ID used for authentication header (value for x-platform-user-id or x-client-user-id).
 * @param getSecretRequest The request details containing userType, userId, and secretType.
 * @returns ServiceResponse containing the secret value or error.
 */
export async function getSecretApiClient(
  getSecretRequest: GetSecretRequest,
  platformUserId: string,
  platformApiKey: string,
  clientUserId: string
): Promise<ServiceResponse<SecretValue>> {
  const { userType, secretType } = getSecretRequest;
  const userTypeStr = userType === UserType.Platform ? 'platform' : 'client';

  // GET requests use path params and query params.
  return await makeAPIServiceRequest<SecretValue>(
    SECRET_SERVICE_URL,
    'get',
    `/api/secrets/${secretType}?userType=${userTypeStr}`, // Endpoint with path and query params
    platformUserId, // ID value for the header
    clientUserId,
    platformApiKey,
    userType, // UserType to determine WHICH header to set
    undefined // No request body for GET
    // Query parameters are now part of the URL path
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
  const { userType, secretType } = checkSecretRequest;
  const userTypeStr = userType === UserType.Platform ? 'platform' : 'client';

  // GET requests use path params and query params.
  return await makeWebAuthenticatedServiceRequest<SecretExists>(
    SECRET_SERVICE_URL,
    'get',
    `/api/secrets/exists/${secretType}?userType=${userTypeStr}`, // Endpoint with path and query params
    platformUserId, // ID value for the header
    userType, // UserType to determine WHICH header to set
    undefined // No request body for GET
    // Query parameters are now part of the URL path
  );
} 
/**
 * Checks if a secret exists via the secret service.
 * 
 * @param platformUserId The ID used for authentication header (value for x-platform-user-id or x-client-user-id).
 * @param checkSecretRequest The request details containing userType, userId, and secretType.
 * @returns ServiceResponse containing boolean existence status or error.
 */
export async function checkSecretExistsApiClient(
  checkSecretRequest: CheckSecretRequest,
  platformUserId: string,
  platformApiKey: string,
  clientUserId: string
): Promise<ServiceResponse<SecretExists>> {
  const { userType, secretType } = checkSecretRequest;
  const userTypeStr = userType === UserType.Platform ? 'platform' : 'client';

  // GET requests use path params and query params.
  return await makeAPIServiceRequest<SecretExists>(
    SECRET_SERVICE_URL,
    'get',
    `/api/secrets/exists/${secretType}?userType=${userTypeStr}`, // Endpoint with path and query params
    platformUserId, // ID value for the header
    clientUserId,
    platformApiKey,
    userType, // UserType to determine WHICH header to set
    undefined // No request body for GET
    // Query parameters are now part of the URL path
  );
} 