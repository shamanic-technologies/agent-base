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
 * Fetches all webhook definitions created by the specified user via the API Gateway.
 * @param credentials - Internal service credentials containing platformApiKey, platformUserId, clientUserId.
 * @returns ServiceResponse containing an array of Webhooks or an error.
 */
export async function listApiTools(
    externalCredentials: ExternalCredentials,
    apiToolApiKey: string,
): Promise<ServiceResponse<ApiToolInfo[]>> {
    const customHeaders : Record<string, string> = {
        'x-platform-user-id': externalCredentials.platformUserId,
        'x-client-user-id': externalCredentials.clientUserId,
        'x-client-organization-id': externalCredentials.clientOrganizationId,
        'x-platform-api-key': externalCredentials.platformApiKey,
        'Authorization': `Bearer ${apiToolApiKey}`,
    };
    if (externalCredentials.agentId) {
        customHeaders['x-agent-id'] = externalCredentials.agentId;
    }

    return makeExternalApiServiceRequest<ApiToolInfo[]>(
        getApiToolApiUrl(),
        'GET',
        '/',
        undefined,
        undefined,
        customHeaders
    );
}


/**
 * Fetches the api tool info for the specified id.
 * @param credentials - Internal service credentials containing platformApiKey, platformUserId, clientUserId.
 * @param id - The id of the api tool to fetch.
 * @returns ServiceResponse containing an array of Webhooks or an error.
 */
export async function getApiToolInfo(
    externalCredentials: ExternalCredentials,
    apiToolApiKey: string,
    id: string
): Promise<ServiceResponse<ApiToolInfo>> {
    const customHeaders : Record<string, string> = {
        'x-platform-user-id': externalCredentials.platformUserId,
        'x-client-user-id': externalCredentials.clientUserId,
        'x-client-organization-id': externalCredentials.clientOrganizationId,
        'x-platform-api-key': externalCredentials.platformApiKey,
        'Authorization': `Bearer ${apiToolApiKey}`,
    };
    if (externalCredentials.agentId) {
        customHeaders['x-agent-id'] = externalCredentials.agentId;
    }
    return makeExternalApiServiceRequest<ApiToolInfo>(
        getApiToolApiUrl(),
        'GET',
        '/'+id,
        undefined,
        undefined,
        customHeaders
    );
}

/**
 * Creates a new api tool.
 * @param credentials - Internal service credentials containing platformApiKey, platformUserId, clientUserId.
 * @param apiTool - The api tool to create.
 * @returns ServiceResponse containing an array of Webhooks or an error.
 */
export async function createApiTool(
    externalCredentials: ExternalCredentials,
    apiToolApiKey: string,
    createApiToolRequest: CreateApiToolRequest
): Promise<ServiceResponse<ApiTool>> {
    const customHeaders : Record<string, string> = {
        'x-platform-user-id': externalCredentials.platformUserId,
        'x-client-user-id': externalCredentials.clientUserId,
        'x-client-organization-id': externalCredentials.clientOrganizationId,
        'x-platform-api-key': externalCredentials.platformApiKey,
        'Authorization': `Bearer ${apiToolApiKey}`,
    };
    if (externalCredentials.agentId) {
        customHeaders['x-agent-id'] = externalCredentials.agentId;
    }
    return makeExternalApiServiceRequest<ApiTool>(
        getApiToolApiUrl(),
        'POST',
        '/',
        createApiToolRequest,
        undefined,
        customHeaders
    );
}

/**
 * Creates a new api tool.
 * @param credentials - Internal service credentials containing platformApiKey, platformUserId, clientUserId.
 * @param apiTool - The api tool to create.
 * @returns ServiceResponse containing an array of Webhooks or an error.
 */
export async function executeApiTool(
    externalCredentials: ExternalCredentials,
    apiToolApiKey: string,
    id: string,
    executeToolPayload: ExecuteToolPayload
): Promise<ServiceResponse<ApiToolExecutionResult>> {
    const customHeaders : Record<string, string> = {
        'x-platform-user-id': externalCredentials.platformUserId,
        'x-client-user-id': externalCredentials.clientUserId,
        'x-client-organization-id': externalCredentials.clientOrganizationId,
        'x-platform-api-key': externalCredentials.platformApiKey,
        'Authorization': `Bearer ${apiToolApiKey}`,
    };
    if (externalCredentials.agentId) {
        customHeaders['x-agent-id'] = externalCredentials.agentId;
    }
    return makeExternalApiServiceRequest<ApiToolExecutionResult>(
        getApiToolApiUrl(),
        'POST',
        '/'+id+'/execute',
        executeToolPayload,
        undefined,
        customHeaders
    );
}

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


