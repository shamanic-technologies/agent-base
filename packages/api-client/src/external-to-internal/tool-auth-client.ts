/**
 * API Client functions for interacting with the Agent Service conversation endpoints VIA THE API GATEWAY.
 */
import { 
    ServiceResponse, 
    AgentBaseCredentials,
    GetUserOAuthInput,
    CheckUserOAuthResult
} from '@agent-base/types';
import { makeAgentBaseRequest } from '../utils/service-client.js'; // Added .js
import { getAgentBaseApiUrl } from '../utils/config.js'; // Added .js

const TOOL_AUTH_SERVICE_ROUTE_PREFIX = '/tool-auth'; // Assuming API Gateway prefixes agent routes with /agent


/**
 * Checks a user's OAuth status for a given tool.
 * Corresponds to POST /tool-auth/api/check-auth in API Gateway
 * 
 * @param body - The input data for checking auth status (userId, organizationId, oauthProvider, requiredScopes).
 * @param agentBaseCredentials - Credentials containing the platform API key.
 * @returns A promise resolving to the ServiceResponse containing the auth status.
 */
export const checkAuthExternalApiService = async (
    body: GetUserOAuthInput,
    agentBaseCredentials: AgentBaseCredentials
): Promise<ServiceResponse<CheckUserOAuthResult>> => {
    const AGENT_BASE_API_URL = getAgentBaseApiUrl();
    const endpoint = `${TOOL_AUTH_SERVICE_ROUTE_PREFIX}/api/check-auth`;    
    return makeAgentBaseRequest<CheckUserOAuthResult>( 
        AGENT_BASE_API_URL,
        'POST',
        endpoint,
        agentBaseCredentials,
        body, // Pass body here
        undefined // No query params for POST
    );
};
