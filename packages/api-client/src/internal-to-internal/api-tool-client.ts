/**
 * API Client for the API Tool Service (via API Gateway).
 *
 * This client facilitates communication with the API Tool service,
 * assuming that requests are routed through an API Gateway. The API Gateway
 * is expected to handle service-to-service authentication (e.g., injecting
 * a Bearer token) before forwarding requests to the actual API Tool service.
 *
 * This client sends necessary `x-platform-*` headers required by the
 * API Tool service's `agentAuthMiddleware` for certain endpoints.
 */
import { Method } from 'axios';
import {
    ServiceResponse,
    HumanInternalCredentials,
    ApiToolInfo,       // Basic info for listing tools
    ApiTool,           // Detailed tool information, including schema
    ExecuteToolPayload,  // Payload for executing a tool (likely from @agent-base/types)
    ApiToolExecutionResult, // Response from executing a tool
    ApiToolExecution  // Record of a tool execution (renamed from ApiToolExecutionRecord)
} from '@agent-base/types';
import { makeInternalRequest } from '../utils/service-client.js';
import { getApiGatewayServiceUrl } from '../utils/config.js';

// Define the base path for API tool routes on the API Gateway.
// Adjust this if your API Gateway uses a different prefix for the api-tool-backend.
const API_TOOL_ROUTE_PREFIX = '/api-tool';

/**
 * Lists available API tools (ID and description).
 * Corresponds to: GET /api/v1/ (in api-tool-backend)
 * Exposed via API Gateway at: GET {API_GATEWAY_URL}{API_TOOL_ROUTE_PREFIX}/
 * Authentication: API Gateway handles service key; this endpoint in api-tool-backend
 *                 does not require agentAuthMiddleware. However, sending standard
 *                 x-* headers is good practice if the gateway uses them for logging/rate-limiting.
 *
 * @param {InternalServiceCredentials} credentials - Credentials including platformUserId, clientUserId, platformApiKey.
 * @returns {Promise<ServiceResponse<ApiToolInfo[]>>} Service response containing the list of tool infos or an error.
 */
export async function listApiToolsInternal(
  humanInternalCredentials: HumanInternalCredentials
): Promise<ServiceResponse<ApiToolInfo[]>> {
  const { platformUserId, clientUserId, clientOrganizationId, platformApiKey, agentId } = humanInternalCredentials;
  const endpoint = `${API_TOOL_ROUTE_PREFIX}/`;

  return makeInternalRequest<ApiToolInfo[]>(
    getApiGatewayServiceUrl(),
    'GET' as Method,
    endpoint,
    platformUserId,
    clientUserId,
    clientOrganizationId,
    platformApiKey,
    undefined, // No data body for GET
    undefined, // No query params
    agentId
  );
}

/**
 * Gets detailed information for a specific API tool by its ID.
 * Corresponds to: GET /api/v1/:id (in api-tool-backend)
 * Exposed via API Gateway at: GET {API_GATEWAY_URL}{API_TOOL_ROUTE_PREFIX}/:id
 * Authentication: API Gateway handles service key.
 *
 * @param {HumanInternalCredentials} humanInternalCredentials - Credentials.
 * @param {string} toolId - The ID of the tool to retrieve.
 * @returns {Promise<ServiceResponse<ApiToolInfo>>} Service response containing the tool details or an error.
 */
export async function getApiToolInfoInternal(
  humanInternalCredentials: HumanInternalCredentials,
  toolId: string
): Promise<ServiceResponse<ApiToolInfo>> {
  const { platformUserId, clientUserId, clientOrganizationId, platformApiKey, agentId } = humanInternalCredentials;
  const endpoint = `${API_TOOL_ROUTE_PREFIX}/${toolId}`;

  return makeInternalRequest<ApiToolInfo>(
    getApiGatewayServiceUrl(),
    'GET' as Method,
    endpoint,
    platformUserId,
    clientUserId,
    clientOrganizationId,
    platformApiKey,
    undefined, // No data body for GET
    undefined, // No query params
    agentId
  );
}

/**
 * Fetches all API tools registered/available for the authenticated user.
 * Corresponds to: GET /api/v1/user-api-tools (in api-tool-backend)
 * Exposed via API Gateway at: GET {API_GATEWAY_URL}{API_TOOL_ROUTE_PREFIX}/user-api-tools
 * Authentication: API Gateway handles service key + agentAuthMiddleware in api-tool-backend.
 *
 * @param {HumanInternalCredentials} humanInternalCredentials - Credentials including platformUserId, clientUserId, platformApiKey.
 * @returns {Promise<ServiceResponse<ApiTool[]>>} Service response containing the list of user-specific API tools or an error.
 */
export async function getUserApiToolsInternal(
  humanInternalCredentials: HumanInternalCredentials
): Promise<ServiceResponse<ApiTool[]>> {
  const { platformUserId, clientUserId, clientOrganizationId, platformApiKey, agentId } = humanInternalCredentials;
  const endpoint = `${API_TOOL_ROUTE_PREFIX}/user-api-tools`;

  return makeInternalRequest<ApiTool[]>(
    getApiGatewayServiceUrl(),
    'GET' as Method,
    endpoint,
    platformUserId,
    clientUserId,
    clientOrganizationId,
    platformApiKey,
    undefined, // No data body for GET
    undefined, // No query params
    agentId
  );
}

/**
 * Fetches all tool execution records for the authenticated user.
 * Corresponds to: GET /api/v1/user-tool-executions (in api-tool-backend)
 * Exposed via API Gateway at: GET {API_GATEWAY_URL}{API_TOOL_ROUTE_PREFIX}/user-tool-executions
 * Authentication: API Gateway handles service key + agentAuthMiddleware in api-tool-backend.
 *
 * @param {HumanInternalCredentials} humanInternalCredentials - Credentials.
 * @returns {Promise<ServiceResponse<ApiToolExecution[]>>} Service response containing execution records or an error.
 */
export async function getUserToolExecutionsInternal(
  humanInternalCredentials: HumanInternalCredentials
): Promise<ServiceResponse<ApiToolExecution[]>> {
  const { platformUserId, clientUserId, clientOrganizationId, platformApiKey, agentId } = humanInternalCredentials;
  const endpoint = `${API_TOOL_ROUTE_PREFIX}/user-tool-executions`;

  return makeInternalRequest<ApiToolExecution[]>(
    getApiGatewayServiceUrl(),
    'GET' as Method,
    endpoint,
    platformUserId,
    clientUserId,
    clientOrganizationId,
    platformApiKey,
    undefined, // No data body for GET
    undefined, // No query params
    agentId
  );
}

/**
 * Creates a new API tool configuration.
 * Corresponds to: POST /api/v1/ (in api-tool-backend)
 * Exposed via API Gateway at: POST {API_GATEWAY_URL}{API_TOOL_ROUTE_PREFIX}/
 * Authentication: API Gateway handles service key + agentAuthMiddleware in api-tool-backend.
 *
 * @param {HumanInternalCredentials} humanInternalCredentials - Credentials.
 * @param {Record<string, any>} payload - The data required to create the tool. Should be refined to CreateApiToolPayload type.
 * @returns {Promise<ServiceResponse<ApiTool>>} Service response containing the newly created tool or an error.
 */
export async function createApiToolInternal(
  humanInternalCredentials: HumanInternalCredentials,
  payload: Record<string, any>
): Promise<ServiceResponse<ApiTool>> {
  const { platformUserId, clientUserId, clientOrganizationId, platformApiKey, agentId } = humanInternalCredentials;
  const endpoint = `${API_TOOL_ROUTE_PREFIX}/`;

  return makeInternalRequest<ApiTool>(
    getApiGatewayServiceUrl(),
    'POST' as Method,
    endpoint,
    platformUserId,
    clientUserId,
    clientOrganizationId,
    platformApiKey,
    payload,   // Request body
    undefined, // No query params
    agentId
  );
}

/**
 * Executes a specific API tool by its ID.
 * Corresponds to: POST /api/v1/:id/execute (in api-tool-backend)
 * Exposed via API Gateway at: POST {API_GATEWAY_URL}{API_TOOL_ROUTE_PREFIX}/:id/execute
 * Authentication: API Gateway handles service key + agentAuthMiddleware in api-tool-backend.
 *
 * @param {InternalServiceCredentials} credentials - Credentials.
 * @param {string} toolId - The ID of the tool to execute.
 * @param {ExecuteToolPayload} payload - The input data for the tool execution.
 * @returns {Promise<ServiceResponse<ApiToolExecutionResult>>} Service response containing the execution result or an error.
 */
export async function executeApiToolInternal(
  humanInternalCredentials: HumanInternalCredentials,
  toolId: string,
  payload: ExecuteToolPayload // Assuming ExecuteToolPayload is suitable here
): Promise<ServiceResponse<ApiToolExecutionResult>> {
  const { platformUserId, clientUserId, clientOrganizationId, platformApiKey, agentId } = humanInternalCredentials;
  const endpoint = `${API_TOOL_ROUTE_PREFIX}/${toolId}/execute`;

  return makeInternalRequest<ApiToolExecutionResult>(
    getApiGatewayServiceUrl(),
    'POST' as Method,
    endpoint,
    platformUserId,
    clientUserId,
    clientOrganizationId,
    platformApiKey,
    payload,   // Request body
    undefined, // No query params
    agentId
  );
}
