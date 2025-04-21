/**
 * API Client functions for interacting with the External Utility Tool Service.
 */
import { AgentServiceCredentials, ExecuteToolPayload, ExecuteToolResult, ExternalUtilityTool, ServiceCredentials, ServiceResponse } from '@agent-base/types';
import { makeAPIServiceRequest } from './utils/service-client.js';
import { getExternalUtilityToolServiceUrl } from './utils/config.js'; // Import the config getter
import { Method } from 'axios';

// --- API Client Functions --- //

/**
 * Lists all available external tools.
 * Requires API Authentication.
 * Corresponds to GET /api/tools
 *
 * @param {string} platformUserId - The ID of the platform user.
 * @param {string} clientUserId - The ID of the client user.
 * @param {string} platformApiKey - The platform API key.
 * @returns {Promise<ServiceResponse<ExternalUtilityTool[]>>} Service response containing the list of tools or an error.
 */
export async function listExternalToolsFromAgent(
  agentServiceCredentials: AgentServiceCredentials,
  conversationId: string
): Promise<ServiceResponse<ExternalUtilityTool[]>> {
  const { platformUserId, clientUserId, platformApiKey, agentId } = agentServiceCredentials;
  const baseUrl = getExternalUtilityToolServiceUrl(); // Use the config getter
  const input = {
    url: `${baseUrl}/`,
    method: 'GET' as Method,
    endpoint: '/',
    headers: {
      'x-platform-user-id': platformUserId,
      'x-client-user-id': clientUserId,
      'x-platform-api-key': platformApiKey,
    },
    data: null,
    agentId: agentId,
    params: {
      conversationId
    }
  };
  return makeAPIServiceRequest<ExternalUtilityTool[]>(
    input.url,
    input.method,
    input.endpoint,
    input.headers['x-platform-user-id'],
    input.headers['x-client-user-id'],
    input.headers['x-platform-api-key'],
    input.data,
    input.params,
    input.agentId
  );
}

/**
 * Gets detailed information for a specific external tool by its ID.
 * Requires API Authentication.
 * Corresponds to GET /api/tools/:id
 *
 * @param {string} platformUserId - The ID of the platform user.
 * @param {string} clientUserId - The ID of the client user.
 * @param {string} platformApiKey - The platform API key.
 * @param {string} toolId - The ID of the tool to retrieve.
 * @returns {Promise<ServiceResponse<ExternalUtilityTool>>} Service response containing the tool details or an error.
 */
export async function getExternalToolInfoFromAgent(
  agentServiceCredentials: AgentServiceCredentials,
  conversationId: string,
  toolId: string
): Promise<ServiceResponse<ExternalUtilityTool>> {
  const { platformUserId, clientUserId, platformApiKey, agentId } = agentServiceCredentials;
  const baseUrl = getExternalUtilityToolServiceUrl(); // Use the config getter
  const input = {
    url: `${baseUrl}/${toolId}`,
    method: 'GET' as Method,
    endpoint: `/${toolId}`,
    headers: {
      'x-platform-user-id': platformUserId,
      'x-client-user-id': clientUserId,
      'x-platform-api-key': platformApiKey,
    },
    data: null,
    agentId: agentId,
    params: {
      conversationId
    }
  };
  return makeAPIServiceRequest<ExternalUtilityTool>(
    input.url,
    input.method,
    input.endpoint,
    input.headers['x-platform-user-id'],
    input.headers['x-client-user-id'],
    input.headers['x-platform-api-key'],
    input.data,
    input.params,
    input.agentId
  );
}

/**
 * Creates a new external tool configuration.
 * Requires API Authentication.
 * Corresponds to POST /api/tools
 *
 * @param {string} platformUserId - The ID of the platform user.
 * @param {string} clientUserId - The ID of the client user.
 * @param {string} platformApiKey - The platform API key.
 * @param {CreateExternalToolPayload} payload - The data required to create the tool.
 * @returns {Promise<ServiceResponse<ExternalUtilityTool>>} Service response containing the newly created tool or an error.
 */
export async function createExternalToolFromAgent(
  agentServiceCredentials: AgentServiceCredentials,
  conversationId: string, 
  payload: ExternalUtilityTool
): Promise<ServiceResponse<ExecuteToolResult>> {
  const { platformUserId, clientUserId, platformApiKey, agentId } = agentServiceCredentials;
  const baseUrl = getExternalUtilityToolServiceUrl(); // Use the config getter
  const input = {
    url: `${baseUrl}/`,
    method: 'POST' as Method,
    endpoint: '/',
    headers: {
      'x-platform-user-id': platformUserId,
      'x-client-user-id': clientUserId,
      'x-platform-api-key': platformApiKey,
    },
    data: payload,
    agentId: agentId,
    params: {
      conversationId
    }
  };
  return makeAPIServiceRequest<ExecuteToolResult>(
    input.url,
    input.method,
    input.endpoint,
    input.headers['x-platform-user-id'],
    input.headers['x-client-user-id'],
    input.headers['x-platform-api-key'],
    input.data,
    input.params,
    input.agentId
  );
}

/**
 * Executes a specific external tool by its ID.
 * Requires API Authentication.
 * Corresponds to POST /api/tools/:id/execute
 *
 * @param {string} platformUserId - The ID of the platform user.
 * @param {string} clientUserId - The ID of the client user.
 * @param {string} platformApiKey - The platform API key.
 * @param {string} toolId - The ID of the tool to execute.
 * @param {ExecuteExternalToolPayload} exectuteToolPayload - The input data or parameters for the tool execution.
 * @returns {Promise<ServiceResponse<ExecuteExternalToolResult>>} Service response containing the execution result or an error.
 */
export async function executeExternalToolFromAgent(
  agentServiceCredentials: AgentServiceCredentials,
  toolId: string,
  exectuteToolPayload: ExecuteToolPayload
): Promise<ServiceResponse<ExecuteToolResult>> {
  const { platformUserId, clientUserId, platformApiKey, agentId } = agentServiceCredentials;
  const baseUrl = getExternalUtilityToolServiceUrl(); // Use the config getter
  const input = {
    url: `${baseUrl}/${toolId}/execute`,
    method: 'POST' as Method,
    endpoint: `/${toolId}/execute`,
    headers: {
      'x-platform-user-id': platformUserId,
      'x-client-user-id': clientUserId,
      'x-platform-api-key': platformApiKey,
    },
    data: exectuteToolPayload,
    agentId: agentId,
    params: null
  };
  return makeAPIServiceRequest<ExecuteToolResult>(
    input.url,
    input.method,
    input.endpoint,
    input.headers['x-platform-user-id'],
    input.headers['x-client-user-id'],
    input.headers['x-platform-api-key'],
    input.data,
    input.params,
    input.agentId
  );
}