/**
 * API Client for Utility Tool Service via API Gateway
 * 
 * Provides specific functions to interact with the utility tool service endpoints
 * exposed specifically through the API Gateway, using the shared makeAPIServiceRequest.
 */
import { 
    ServiceResponse, 
    UtilityInfo, 
    ExecuteToolResult,
    ListUtilities,
    ExecuteToolPayload,
    AgentInternalCredentials,
    InternalUtilityInfo
} from '@agent-base/types';
import { makeInternalRequest } from '../utils/service-client.js'; // Import the shared helper
import { getApiGatewayServiceUrl } from '../utils/config.js';

/**
 * Calls a specific utility tool via the API Gateway using makeAPIServiceRequest.
 * 
 * @param config - API client configuration (URL, credentials).
 * @param utilityId - The ID of the utility to call.
 * @param executeToolPayload - Input parameters for the utility.
 * @returns The ServiceResponse from the API Gateway.
 * @throws Throws AxiosError if the request fails (handled by makeAPIServiceRequest, returning ErrorResponse).
 */
export async function callUtilityFromAgent(
    agentInternalCredentials: AgentInternalCredentials,
    utilityId: string,
    executeToolPayload: ExecuteToolPayload
): Promise<ServiceResponse<ExecuteToolResult>> {
    const { clientUserId, platformUserId, clientOrganizationId, platformApiKey, agentId } = agentInternalCredentials;
    const endpoint = `utility-tool/run`;

    // Use makeAPIServiceRequest, passing conversationId in data and agentId for header
    return await makeInternalRequest<ExecuteToolResult>(
        getApiGatewayServiceUrl(),
        'post',
        endpoint,
        platformUserId,
        clientUserId,
        clientOrganizationId,
        platformApiKey,
        executeToolPayload, // Pass data containing input and conversationId
        { id: utilityId }, // Pass utilityId as a query parameter
        agentId      // Pass agentId for the header
    );
}

/**
 * Fetches detailed information about a specific utility via the API Gateway using makeAPIServiceRequest.
 * 
 * @param config - API client configuration (URL, credentials).
 * @param utilityId - The ID of the utility.
 * @returns The ServiceResponse from the API Gateway.
 * @throws Throws AxiosError if the request fails (handled by makeAPIServiceRequest, returning ErrorResponse).
 */
export async function getUtilityInfoFromAgent(
    agentInternalCredentials: AgentInternalCredentials,
    conversationId: string,
    utilityId: string
): Promise<ServiceResponse<UtilityInfo>> {
    const { clientUserId, platformUserId, clientOrganizationId, platformApiKey, agentId } = agentInternalCredentials;
    const endpoint = `utility-tool/get`;


    return await makeInternalRequest<UtilityInfo>(
        getApiGatewayServiceUrl(),
        'get',
        endpoint,
        platformUserId,
        clientUserId,
        clientOrganizationId,
        platformApiKey,
        undefined,    // No data body for GET
        { conversationId, id: utilityId }, // Pass utilityId as a query parameter
        agentId       // Pass agentId for the header
    );
}

/**
 * Fetches the list of available utilities via the API Gateway using makeAPIServiceRequest.
 * 
 * @param agentServiceCredentials - API client configuration (URL, credentials).
 * @returns The ServiceResponse from the API Gateway.
 * @throws Throws AxiosError if the request fails (handled by makeAPIServiceRequest, returning ErrorResponse).
 */
export async function listUtilitiesFromAgent(
    agentInternalCredentials: AgentInternalCredentials,
    conversationId: string
): Promise<ServiceResponse<ListUtilities>> {
    const { clientUserId, platformUserId, clientOrganizationId, platformApiKey, agentId } = agentInternalCredentials;
    // conversationId not needed for this endpoint
    const endpoint = 'utility-tool/list';
   // Use makeAPIServiceRequest, passing agentId for header and conversationId as query param
    return await makeInternalRequest<ListUtilities>(
        getApiGatewayServiceUrl(),
        'get',
        endpoint,
        platformUserId,
        clientUserId,
        clientOrganizationId,
        platformApiKey,
        undefined, // No data body for GET
        { conversationId: conversationId }, // Pass conversationId as a query parameter object
        agentId    // Pass agentId for the header
    );

}

/**
 * Fetches the list of client-side only utilities.
 *
 * @param agentInternalCredentials - API client configuration (URL, credentials).
 * @returns The ServiceResponse from the API Gateway.
 */
export async function listClientSideUtilitiesFromAgent(
    agentInternalCredentials: AgentInternalCredentials
): Promise<ServiceResponse<InternalUtilityInfo[]>> {
    const { clientUserId, platformUserId, clientOrganizationId, platformApiKey, agentId } = agentInternalCredentials;
    const endpoint = 'utility-tool/client-side-tools';

    return await makeInternalRequest<InternalUtilityInfo[]>(
        getApiGatewayServiceUrl(),
        'get',
        endpoint,
        platformUserId,
        clientUserId,
        clientOrganizationId,
        platformApiKey,
        undefined,
        undefined,
        agentId
    );
}