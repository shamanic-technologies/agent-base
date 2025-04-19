/**
 * API Client functions for interacting with the External Utility Tool Service.
 */
import { ExecuteExternalToolPayload, ExecuteExternalToolResult, ExternalUtilityTool, ServiceResponse } from '@agent-base/types';
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
export async function listExternalTools(
  platformUserId: string,
  clientUserId: string,
  platformApiKey: string
): Promise<ServiceResponse<ExternalUtilityTool[]>> {
  const baseUrl = getExternalUtilityToolServiceUrl(); // Use the config getter
  return makeAPIServiceRequest<ExternalUtilityTool[]>(
    baseUrl,
    'GET',
    '/', // Endpoint path for listing tools
    platformUserId,
    clientUserId,
    platformApiKey
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
  platformUserId: string,
  clientUserId: string,
  platformApiKey: string,
  toolId: string
): Promise<ServiceResponse<ExternalUtilityTool>> {
  if (!toolId) {
    return { success: false, error: 'Tool ID is required to get tool info.' };
  }
  const baseUrl = getExternalUtilityToolServiceUrl(); // Use the config getter
  return makeAPIServiceRequest<ExternalUtilityTool>(
    baseUrl,
    'GET',
    `/${toolId}`, // Endpoint path for getting specific tool info
    platformUserId,
    clientUserId,
    platformApiKey
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
  platformUserId: string,
  clientUserId: string,
  platformApiKey: string,
  payload: ExternalUtilityTool
): Promise<ServiceResponse<ExternalUtilityTool>> {
  if (!payload || typeof payload !== 'object') {
    return { success: false, error: 'Valid payload is required to create a tool.' };
  }
  const baseUrl = getExternalUtilityToolServiceUrl(); // Use the config getter
  return makeAPIServiceRequest<ExternalUtilityTool>(
    baseUrl,
    'POST',
    '/', // Endpoint path for creating tools
    platformUserId,
    clientUserId,
    platformApiKey,
    payload // Pass the payload as data
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
  platformUserId: string,
  clientUserId: string,
  platformApiKey: string,
  toolId: string,
  payload: ExecuteExternalToolPayload
): Promise<ServiceResponse<ExecuteExternalToolResult>> {
  if (!toolId) {
    return { success: false, error: 'Tool ID is required to execute a tool.' };
  }
  // Payload might be optional for some tools, but we expect an object if provided
  if (payload && typeof payload !== 'object') {
      return { success: false, error: "Payload must be an object if provided." };
  }

  const baseUrl = getExternalUtilityToolServiceUrl(); // Use the config getter
  return makeAPIServiceRequest<ExecuteExternalToolResult>(
    baseUrl,
    'POST',
    `/${toolId}/execute`, // Endpoint path for executing a tool
    platformUserId,
    clientUserId,
    platformApiKey,
    payload || {} // Pass the payload as data, default to empty object if null/undefined
  );
} 