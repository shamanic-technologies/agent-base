/**
 * API Client functions for interacting with the External Utility Tool Service.
 */
import { AgentServiceCredentials, ExecuteExternalToolPayload, ExecuteExternalToolResult, ExecuteToolResult, ExternalUtilityTool, ServiceCredentials, ServiceResponse } from '@agent-base/types';
import { makeAPIServiceRequest } from './utils/service-client.js';
import { getExternalUtilityToolServiceUrl } from './utils/config.js'; // Import the config getter



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
): Promise<ServiceResponse<ExternalUtilityTool[]>> {
  const { platformUserId, clientUserId, platformApiKey, agentId } = agentServiceCredentials;
  const baseUrl = getExternalUtilityToolServiceUrl(); // Use the config getter
  return makeAPIServiceRequest<ExternalUtilityTool[]>(
    baseUrl,
    'GET',
    '/', // Endpoint path for listing tools
    platformUserId,
    clientUserId,
    platformApiKey,
    agentId
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
export async function getExternalToolInfo(
  credentials: ServiceCredentials,
  toolId: string
): Promise<ServiceResponse<ExternalUtilityTool>> {
  const { platformUserId, clientUserId, platformApiKey, agentId } = credentials;
  const baseUrl = getExternalUtilityToolServiceUrl(); // Use the config getter
  return makeAPIServiceRequest<ExternalUtilityTool>(
    baseUrl,
    'GET',
    `/${toolId}`, // Endpoint path for getting specific tool info
    platformUserId,
    clientUserId,
    platformApiKey,
    agentId
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
export async function createExternalTool(
  credentials: ServiceCredentials,
  payload: ExternalUtilityTool
): Promise<ServiceResponse<ExecuteToolResult>> {
  const { platformUserId, clientUserId, platformApiKey, agentId } = credentials;
  const baseUrl = getExternalUtilityToolServiceUrl(); // Use the config getter
  return makeAPIServiceRequest<ExecuteToolResult>(
    baseUrl,
    'POST',
    '/', // Endpoint path for creating tools
    platformUserId,
    clientUserId,
    platformApiKey,
    payload, // Pass the payload as data
    agentId
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
 * @param {ExecuteExternalToolPayload} payload - The input data or parameters for the tool execution.
 * @returns {Promise<ServiceResponse<ExecuteExternalToolResult>>} Service response containing the execution result or an error.
 */
export async function executeExternalTool(
  credentials: ServiceCredentials,
  toolId: string,
  payload: ExecuteExternalToolPayload
): Promise<ServiceResponse<ExecuteExternalToolResult>> {
  const { platformUserId, clientUserId, platformApiKey, agentId } = credentials;
  const baseUrl = getExternalUtilityToolServiceUrl(); // Use the config getter
  return makeAPIServiceRequest<ExecuteExternalToolResult>(
    baseUrl,
    'POST',
    `/${toolId}/execute`, // Endpoint path for executing a tool
    platformUserId,
    clientUserId,
    platformApiKey,
    payload || {}, // Pass the payload as data, default to empty object if null/undefined
    agentId
  );
} 