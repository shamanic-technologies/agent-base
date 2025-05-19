/**
 * API client for interacting with the Agent Service.
 * This client handles making HTTP requests to the agent service endpoints.
 */
import {
  AgentRecord,
  CreateClientUserAgentInput,
  GetClientUserAgentInput,
  // ListUserAgentsResponse, // Not directly used, ServiceResponse<AgentRecord[]> is used
  ServiceResponse,
  UpdateAgentInput,
  Agent,
  // UserAgentResponse // Not directly used, ServiceResponse<AgentRecord> is used
} from '@agent-base/types';
import { makeInternalAPIServiceRequest } from '../../utils/service-client.js'; // Reverted .js extension
import { getAgentServiceUrl } from '../../utils/config.js'; // Reverted .js extension

/**
 * Updates the memory for a specific agent via the agent service.
 * This function calls the PATCH /api/agents/:agentId/memory endpoint.
 *
 * @param agentId The ID of the agent whose memory is to be updated. This will be part of the URL path.
 * @param memory The new memory content for the agent. This will be in the request body.
 * @param platformUserId The platform user ID (for x-platform-user-id header).
 * @param platformApiKey The platform API key (for x-platform-api-key header).
 * @param clientUserId The client user ID (for x-client-user-id header).
 * @returns A promise that resolves to a ServiceResponse containing the updated agent record or an error.
 */
export async function updateAgentMemoryApiClient(
  agentId: string,
  memory: string,
  platformUserId: string,
  platformApiKey: string,
  clientUserId: string
): Promise<ServiceResponse<Agent>> {
  const requestPath = `/${agentId}/memory`; // Construct path with agentId
  const requestBody = { memory };

  return await makeInternalAPIServiceRequest<Agent>(
    getAgentServiceUrl(),
    'patch',
    requestPath,
    platformUserId,
    clientUserId,
    platformApiKey,
    requestBody,
    undefined
  );
}
