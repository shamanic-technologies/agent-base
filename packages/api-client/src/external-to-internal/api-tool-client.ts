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


