/**
 * Manual API Client for Webhook Store Service
 */
import {
    ServiceResponse,
    ExternalServiceCredentials,
    ApiTool,
    ApiToolExecutionResponse,
    ExecuteToolPayload,
    ServiceCredentials,
    ApiToolInfo,
} from '@agent-base/types';
import { makeExternalApiServiceRequest, makePlatformUserApiServiceRequest } from '../utils/service-client.js';
import { getApiToolApiUrl } from '../utils/config.js';

/**
 * Fetches all webhook definitions created by the specified user via the API Gateway.
 * @param credentials - Internal service credentials containing platformApiKey, platformUserId, clientUserId.
 * @returns ServiceResponse containing an array of Webhooks or an error.
 */
export async function listApiTools(
    serviceCredentials: ExternalServiceCredentials,
): Promise<ServiceResponse<ApiToolInfo[]>> {
    const customHeaders : Record<string, string> = {
        'x-platform-user-id': serviceCredentials.platformUserId,
        'x-client-user-id': serviceCredentials.clientUserId,
        'x-platform-api-key': serviceCredentials.platformApiKey,
    };
    if (serviceCredentials.agentId) {
        customHeaders['x-agent-id'] = serviceCredentials.agentId;
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
    externalApiServiceCredentials: ExternalServiceCredentials,
    id: string
): Promise<ServiceResponse<ApiToolInfo>> {
    const customHeaders : Record<string, string> = {
        'x-platform-user-id': externalApiServiceCredentials.platformUserId,
        'x-client-user-id': externalApiServiceCredentials.clientUserId,
        'x-platform-api-key': externalApiServiceCredentials.platformApiKey,
    };
    if (externalApiServiceCredentials.agentId) {
        customHeaders['x-agent-id'] = externalApiServiceCredentials.agentId;
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
    externalserviceCredentials: ExternalServiceCredentials,
    apiTool: ApiTool
): Promise<ServiceResponse<ApiTool>> {
    const customHeaders : Record<string, string> = {
        'x-platform-user-id': externalserviceCredentials.platformUserId,
        'x-client-user-id': externalserviceCredentials.clientUserId,
        'x-platform-api-key': externalserviceCredentials.platformApiKey,
    };
    if (externalserviceCredentials.agentId) {
        customHeaders['x-agent-id'] = externalserviceCredentials.agentId;
    }
    return makeExternalApiServiceRequest<ApiTool>(
        getApiToolApiUrl(),
        'POST',
        '/',
        apiTool,
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
    externalApiServiceCredentials: ExternalServiceCredentials,
    id: string,
    executeToolPayload: ExecuteToolPayload
): Promise<ServiceResponse<ApiToolExecutionResponse>> {
    const customHeaders : Record<string, string> = {
        'x-platform-user-id': externalApiServiceCredentials.platformUserId,
        'x-client-user-id': externalApiServiceCredentials.clientUserId,
        'x-platform-api-key': externalApiServiceCredentials.platformApiKey,
    };
    if (externalApiServiceCredentials.agentId) {
        customHeaders['x-agent-id'] = externalApiServiceCredentials.agentId;
    }
    return makeExternalApiServiceRequest<ApiToolExecutionResponse>(
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
 * @param serviceCredentials - External service credentials containing platformApiKey, platformUserId, clientUserId.
 * @returns ServiceResponse containing an array of ApiTool or an error.
 */
export async function getUserApiTools(
    serviceCredentials: ExternalServiceCredentials,
): Promise<ServiceResponse<ApiTool[]>> {
    const customHeaders : Record<string, string> = {
        'x-platform-user-id': serviceCredentials.platformUserId,
        'x-client-user-id': serviceCredentials.clientUserId,
        'x-platform-api-key': serviceCredentials.platformApiKey,
    };
    if (serviceCredentials.agentId) {
        customHeaders['x-agent-id'] = serviceCredentials.agentId;
    }

    return makeExternalApiServiceRequest<ApiTool[]>(
        getApiToolApiUrl(),
        'GET',
        '/user-api-tools',
        undefined,
        undefined,
        customHeaders
    );
}


