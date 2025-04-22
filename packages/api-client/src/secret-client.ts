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
  UserType,
  ExternalApiServiceCredentials // Import UserType
} from '@agent-base/types';
import { makeWebAuthenticatedServiceRequest, makeInternalAPIServiceRequest, makeExternalAPIServiceRequest } from './utils/service-client.js';
import { getApiGatewayServiceUrl, getSecretServiceUrl } from './utils/config'; // Import the centralized getter

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
  // POST requests send data in the body.
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
 * @returns ServiceResponse containing a success message or error.
 */
export async function storeSecretInternalApiClient(
  storeSecretRequest: StoreSecretRequest,
  platformUserId: string,
  platformApiKey: string,
  clientUserId: string
): Promise<ServiceResponse<string>> {

  // POST requests send data in the body.
  return await makeInternalAPIServiceRequest<string>(
    getSecretServiceUrl(), // Use dynamic getter
    'post',
    '/api/secrets', // Endpoint for storing secrets
    platformUserId, // ID value for x-platform-user-id header
    clientUserId,   // ID value for x-client-user-id header
    platformApiKey, // API key for x-platform-api-key header
    storeSecretRequest, // Request body (data)
    undefined // No query parameters (params)
  );
}

/**
 * Calls a specific utility tool via the API Gateway using makeAPIServiceRequest.
 * 
 * @param config - API client configuration (URL, credentials).
 * @param utilityId - The ID of the utility to call.
 * @param executeToolPayload - Input parameters for the utility.
 * @returns The ServiceResponse from the API Gateway.
 * @throws Throws AxiosError if the request fails (handled by makeAPIServiceRequest, returning ErrorResponse).
 */
export async function storeSecretExternalApiClient(
  storeSecretRequest: StoreSecretRequest,
  externalApiServiceCredentials: ExternalApiServiceCredentials,
): Promise<ServiceResponse<string>> {

  // Use makeAPIServiceRequest, passing conversationId in data and agentId for header
  return await makeExternalAPIServiceRequest<string>(
      getApiGatewayServiceUrl(),
      'post',
      'secret/api/secrets', // Endpoint for storing secrets
      externalApiServiceCredentials,
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
  const { userType, secretType } = getSecretRequest; // Include userId

  // GET requests use path params and query params. userType goes in query. userId is implicit via header.
  return await makeWebAuthenticatedServiceRequest<SecretValue>(
    getSecretServiceUrl(), // Use dynamic getter
    'get',
    `/api/secrets/${secretType}`, // Endpoint with path param
    platformUserId, // ID value for header (x-platform-user-id)
    undefined, // No request body (data) for GET
    { userType } // Query parameters (params)
  );
}

/**
 * Retrieves a secret via the secret service using API key authentication.
 * 
 * @param getSecretRequest The request details containing userType, userId, and secretType.
 * @param platformUserId The platform user ID (for x-platform-user-id header).
 * @param platformApiKey The platform API key (for x-platform-api-key header).
 * @param clientUserId The client user ID (for x-client-user-id header).
 * @returns ServiceResponse containing the secret value or error.
 */
export async function getSecretApiClient(
  getSecretRequest: GetSecretRequest,
  platformUserId: string,
  platformApiKey: string,
  clientUserId: string
): Promise<ServiceResponse<SecretValue>> {
  const { userType, secretType } = getSecretRequest; // Include userId
  const userTypeStr = userType === UserType.Platform ? 'platform' : 'client';

  // GET requests use path params and query params. userType goes in query. userId is implicit via headers.
  return await makeInternalAPIServiceRequest<SecretValue>(
    getSecretServiceUrl(), // Use dynamic getter
    'get',
    `/api/secrets/${secretType}`, // Endpoint with path param
    platformUserId, // ID value for x-platform-user-id header
    clientUserId,   // ID value for x-client-user-id header
    platformApiKey, // API key for x-platform-api-key header
    undefined,      // No request body (data) for GET
    { userType: userTypeStr } // Query parameters (params)
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
  const { userType, secretType } = checkSecretRequest; // Include userId
  const userTypeStr = userType === UserType.Platform ? 'platform' : 'client';

  // GET requests use path params and query params. userType goes in query. userId is implicit via header.
  return await makeWebAuthenticatedServiceRequest<SecretExists>(
    getSecretServiceUrl(), // Use dynamic getter
    'get',
    `/api/secrets/exists/${secretType}`, // Endpoint with path param
    platformUserId, // ID value for header (x-platform-user-id)
    undefined, // No request body (data) for GET
    { userType: userTypeStr } // Query parameters (params)
  );
} 

/**
 * Checks if a secret exists via the secret service using API key authentication.
 * 
 * @param checkSecretRequest The request details containing userType, userId, and secretType.
 * @param platformUserId The platform user ID (for x-platform-user-id header).
 * @param platformApiKey The platform API key (for x-platform-api-key header).
 * @param clientUserId The client user ID (for x-client-user-id header).
 * @returns ServiceResponse containing boolean existence status or error.
 */
export async function checkSecretExistsApiClient(
  checkSecretRequest: CheckSecretRequest,
  platformUserId: string,
  platformApiKey: string,
  clientUserId: string
): Promise<ServiceResponse<SecretExists>> {
  const { userType, secretType } = checkSecretRequest; // Include userId
  const userTypeStr = userType === UserType.Platform ? 'platform' : 'client';

  // GET requests use path params and query params. userType goes in query. userId is implicit via headers.
  return await makeInternalAPIServiceRequest<SecretExists>(
    getSecretServiceUrl(), // Use dynamic getter
    'get',
    `/api/secrets/exists/${secretType}`, // Endpoint with path param
    platformUserId, // ID value for x-platform-user-id header
    clientUserId,   // ID value for x-client-user-id header
    platformApiKey, // API key for x-platform-api-key header
    undefined,      // No request body (data) for GET
    { userType: userTypeStr } // Query parameters (params)
  );
} 