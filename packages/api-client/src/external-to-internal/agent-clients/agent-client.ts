/**
 * Client functions for interacting with the Agent Service.
 */
import { ServiceResponse, Agent, AgentBaseCredentials } from '@agent-base/types'; // Assuming Agent type exists
import { makeAgentBaseRequest } from '../../utils/service-client.js';
import { getAgentBaseApiUrl } from '../../utils/config.js';

const AGENT_SERVICE_ROUTE_PREFIX = '/agent'; // Assuming API Gateway prefixes agent routes with /agent

/**
 * Retrieves an existing agent or creates a new one based on the provided credentials.
 * This function calls the '/agents/get-or-create' endpoint via the API Gateway.
 * Authentication is handled using platformClientUserId and platformApiKey.
 *
 * @param {PlatformUserApiServiceCredentials} platformUserApiServiceCredentials - Object containing platformClientUserId and platformApiKey.
 * @returns {Promise<ServiceResponse<Agent>>} - A promise that resolves with the service response containing the agent data or an error.
 */
export async function getOrCreateAgents(
  agentBaseCredentials: AgentBaseCredentials
): Promise<ServiceResponse<Agent[]>> { // Assuming the endpoint returns an Agent object
  const serviceUrl = getAgentBaseApiUrl(); // Use the API Gateway URL
  const endpoint = AGENT_SERVICE_ROUTE_PREFIX + '/get-or-create-user-agents'; // Assumed endpoint path
  const method = 'GET';

  // Using makePlatformUserApiServiceRequest as it correctly handles the required headers
  return makeAgentBaseRequest<Agent[]>(
    serviceUrl,
    method,
    endpoint,
    agentBaseCredentials,
    {} // Assuming no specific request body is needed for get-or-create based solely on user context
  );
} 