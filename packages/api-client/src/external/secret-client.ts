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
  PlatformUserApiServiceCredentials // Import UserType
} from '@agent-base/types';
import { makeWebAuthenticatedServiceRequest, makeInternalAPIServiceRequest, makePlatformUserApiServiceRequest } from '../utils/service-client.js';
import { getApiGatewayServiceUrl, getSecretServiceUrl } from '../utils/config.js'; // Import the centralized getter
import { Method } from 'axios';

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
  externalApiServiceCredentials: PlatformUserApiServiceCredentials,
): Promise<ServiceResponse<string>> {

  // Use makeAPIServiceRequest, passing conversationId in data and agentId for header
  return await makePlatformUserApiServiceRequest<string>(
      getApiGatewayServiceUrl(),
      'post',
      'secret/api/secrets', // Endpoint for storing secrets
      externalApiServiceCredentials,
      storeSecretRequest, // Request body (data)
      undefined // No query parameters (params)
  );
}
