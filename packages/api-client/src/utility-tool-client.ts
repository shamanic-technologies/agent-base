/**
 * API Client for Utility Tool Service via API Gateway
 * 
 * Provides specific functions to interact with the utility tool service endpoints
 * exposed specifically through the API Gateway, using the shared makeAPIServiceRequest.
 */
import { 
    ServiceResponse, 
    UtilityInfo, 
    UtilitiesList ,
    AgentServiceCredentials,
    ExecuteToolResult,
    ListUtilities,
    ExecuteToolPayload
} from '@agent-base/types';
import { makeInternalAPIServiceRequest } from './utils/service-client.js'; // Import the shared helper
import { getApiGatewayServiceUrl } from './utils/config.js';




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
    agentServiceCredentials: AgentServiceCredentials,
    utilityId: string,
    executeToolPayload: ExecuteToolPayload
): Promise<ServiceResponse<ExecuteToolResult>> {
    const { clientUserId, platformUserId, platformApiKey, agentId } = agentServiceCredentials;
    const endpoint = `utility-tool/call-tool/${utilityId}`;

    // Use makeAPIServiceRequest, passing conversationId in data and agentId for header
    return await makeInternalAPIServiceRequest<ExecuteToolResult>(
        getApiGatewayServiceUrl(),
        'post',
        endpoint,
        platformUserId,
        clientUserId,
        platformApiKey,
        executeToolPayload, // Pass data containing input and conversationId
        undefined,
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
    agentServiceCredentials: AgentServiceCredentials,
    conversationId: string,
    utilityId: string
): Promise<ServiceResponse<UtilityInfo>> {
    const { clientUserId, platformUserId, platformApiKey, agentId } = agentServiceCredentials;
    const endpoint = `utility-tool/get-details/${utilityId}`;


    return await makeInternalAPIServiceRequest<UtilityInfo>(
        getApiGatewayServiceUrl(),
        'get',
        endpoint,
        platformUserId,
        clientUserId,
        platformApiKey,
        undefined,    // No data body for GET
        {conversationId},
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
    agentServiceCredentials: AgentServiceCredentials,
    conversationId: string
): Promise<ServiceResponse<ListUtilities>> {
    const { clientUserId, platformUserId, platformApiKey, agentId } = agentServiceCredentials;
    // conversationId not needed for this endpoint
    const endpoint = 'utility-tool/get-list';
   // Use makeAPIServiceRequest, passing agentId for header and conversationId as query param
    return await makeInternalAPIServiceRequest<ListUtilities>(
        getApiGatewayServiceUrl(),
        'get',
        endpoint,
        platformUserId,
        clientUserId,
        platformApiKey,
        undefined, // No data body for GET
        { conversationId: conversationId }, // Pass conversationId as a query parameter object
        agentId    // Pass agentId for the header
    );

}