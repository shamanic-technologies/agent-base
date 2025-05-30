/**
 * API Client for interacting with the Secret Service
 */
import { 
  ServiceResponse, 
  StoreSecretRequest,
  AgentBaseCredentials,
} from '@agent-base/types';
import { makeAgentBaseRequest } from '../utils/service-client.js';
import { getApiGatewayServiceUrl } from '../utils/config.js'; // Import the centralized getter

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
  agentBaseCredentials: AgentBaseCredentials,
): Promise<ServiceResponse<string>> {

  // Use makeAPIServiceRequest, passing conversationId in data and agentId for header
  return await makeAgentBaseRequest<string>(
      getApiGatewayServiceUrl(),
      'post',
      'secret/api/secrets', // Endpoint for storing secrets
      agentBaseCredentials,
      storeSecretRequest, // Request body (data)
      undefined // No query parameters (params)
  );
}
