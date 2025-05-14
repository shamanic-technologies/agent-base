/**
 * Manual API Client for Webhook Store Service
 */
import {
    ServiceResponse,
    PlatformUserApiServiceCredentials,
    ApiTool,
    ApiToolExecutionResponse,
    ExecuteToolPayload,
    ExternalUtilityExecutionResponse
} from '@agent-base/types';
import { makePlatformUserApiServiceRequest } from '../utils/service-client.js';
import { getApiToolApiUrl } from '../utils/config.js';

/**
 * Fetches all webhook definitions created by the specified user via the API Gateway.
 * @param credentials - Internal service credentials containing platformApiKey, platformUserId, clientUserId.
 * @returns ServiceResponse containing an array of Webhooks or an error.
 */
export async function listApiTools(
    externalApiServiceCredentials: PlatformUserApiServiceCredentials
): Promise<ServiceResponse<ApiTool[]>> {

    return makePlatformUserApiServiceRequest<ApiTool[]>(
        getApiToolApiUrl(),
        'GET',
        '/',
        externalApiServiceCredentials,
        undefined,
        undefined
    );
}

/**
 * Fetches the api tool info for the specified id.
 * @param credentials - Internal service credentials containing platformApiKey, platformUserId, clientUserId.
 * @param id - The id of the api tool to fetch.
 * @returns ServiceResponse containing an array of Webhooks or an error.
 */
export async function getApiToolInfo(
    externalApiServiceCredentials: PlatformUserApiServiceCredentials,
    id: string
): Promise<ServiceResponse<ApiToolExecutionResponse>> {

    return makePlatformUserApiServiceRequest<ApiToolExecutionResponse>(
        getApiToolApiUrl(),
        'GET',
        '/:id',
        externalApiServiceCredentials,
        undefined,
        undefined
    );
}

/**
 * Creates a new api tool.
 * @param credentials - Internal service credentials containing platformApiKey, platformUserId, clientUserId.
 * @param apiTool - The api tool to create.
 * @returns ServiceResponse containing an array of Webhooks or an error.
 */
export async function createApiTool(
    externalApiServiceCredentials: PlatformUserApiServiceCredentials,
    apiTool: ApiTool
): Promise<ServiceResponse<ApiTool>> {

    return makePlatformUserApiServiceRequest<ApiTool>(
        getApiToolApiUrl(),
        'POST',
        '/',
        externalApiServiceCredentials,
        apiTool,
        undefined
    );
}

/**
 * Creates a new api tool.
 * @param credentials - Internal service credentials containing platformApiKey, platformUserId, clientUserId.
 * @param apiTool - The api tool to create.
 * @returns ServiceResponse containing an array of Webhooks or an error.
 */
export async function executeApiTool(
    externalApiServiceCredentials: PlatformUserApiServiceCredentials,
    id: string,
    executeToolPayload: ExecuteToolPayload
): Promise<ServiceResponse<ExternalUtilityExecutionResponse>> {

    return makePlatformUserApiServiceRequest<ExternalUtilityExecutionResponse>(
        getApiToolApiUrl(),
        'POST',
        '/:id/execute',
        externalApiServiceCredentials,
        executeToolPayload,
        undefined
    );
}


