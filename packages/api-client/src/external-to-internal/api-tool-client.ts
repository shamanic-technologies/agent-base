/**
 * Manual API Client for Webhook Store Service
 */
import {
    ServiceResponse,
    ApiTool,
    ApiToolExecutionResult,
    ExecuteToolPayload,
    ApiToolInfo,
    SearchApiToolResult,
    CreateApiToolRequest,
    ExternalCredentials,
    AgentBaseCredentials
} from '@agent-base/types';
import { makeExternalApiServiceRequest, makeAgentBaseRequest } from '../utils/service-client.js';
import { getAgentBaseApiUrl, getApiToolApiUrl } from '../utils/config.js';


/**
 * Fetches all API tools for the authenticated user.
 * @param externalCredentials - Platform user service credentials.
 * @returns ServiceResponse containing an array of ApiTool or an error.
 */
export async function getUserApiTools(
    agentBaseCredentials: AgentBaseCredentials,
): Promise<ServiceResponse<SearchApiToolResult>> {
    return makeAgentBaseRequest<SearchApiToolResult>(
        getAgentBaseApiUrl(),
        'GET',
        '/api-tool/user-api-tools',
        agentBaseCredentials,
        undefined,
        undefined
    );
}

/**
 * Creates a new API tool.
 * @param agentBaseCredentials - Credentials for authentication.
 * @param payload - The data for the new tool.
 * @returns ServiceResponse containing the created ApiTool or an error.
 */
export async function createApiTool(
    agentBaseCredentials: AgentBaseCredentials,
    payload: CreateApiToolRequest
): Promise<ServiceResponse<ApiTool>> {
    return makeAgentBaseRequest<ApiTool>(
        getAgentBaseApiUrl(),
        'POST',
        '/api-tool/',
        agentBaseCredentials,
        payload
    );
}

/**
 * Executes a given API tool by ID.
 * @param agentBaseCredentials - Credentials for authentication.
 * @param toolId - The ID of the tool to execute.
 * @param payload - The payload for the tool execution.
 * @returns ServiceResponse containing the execution result or an error.
 */
export async function executeApiTool(
    agentBaseCredentials: AgentBaseCredentials,
    toolId: string,
    payload: ExecuteToolPayload
): Promise<ServiceResponse<ApiToolExecutionResult>> {
    return makeAgentBaseRequest<ApiToolExecutionResult>(
        getAgentBaseApiUrl(),
        'POST',
        `/api-tool/execute/${toolId}`,
        agentBaseCredentials,
        payload
    );
}

/**
 * Gets information about a specific API tool.
 * @param agentBaseCredentials - Credentials for authentication.
 * @param toolId - The ID of the tool.
 * @returns ServiceResponse containing the ApiToolInfo or an error.
 */
export async function getApiToolInfo(
    agentBaseCredentials: AgentBaseCredentials,
    toolId: string
): Promise<ServiceResponse<ApiToolInfo>> {
    return makeAgentBaseRequest<ApiToolInfo>(
        getAgentBaseApiUrl(),
        'GET',
        `/api-tool/${toolId}`,
        agentBaseCredentials
    );
}

/**
 * Lists all available API tools.
 * @param agentBaseCredentials - Credentials for authentication.
 * @returns ServiceResponse containing an array of ApiToolInfo or an error.
 */
export async function listApiTools(
    agentBaseCredentials: AgentBaseCredentials
): Promise<ServiceResponse<ApiToolInfo[]>> {
    return makeAgentBaseRequest<ApiToolInfo[]>(
        getAgentBaseApiUrl(),
        'GET',
        '/api-tool/',
        agentBaseCredentials
    );
}


