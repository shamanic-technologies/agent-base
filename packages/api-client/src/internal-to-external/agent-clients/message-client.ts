/**
 * API Client functions for interacting with the Agent Service conversation endpoints VIA THE API GATEWAY.
 */
import { 
    ServiceResponse, 
    AgentBaseCredentials,
} from '@agent-base/types';
import { makeAgentBaseRequest } from '../../utils/service-client.js'; // Added .js
import { getAgentBaseApiUrl } from '../../utils/config.js'; // Added .js
import { Message } from 'ai';

const AGENT_SERVICE_ROUTE_PREFIX = '/agent'; // Assuming API Gateway prefixes agent routes with /agent

/**
 * Fetches conversations for a specific agent via API Gateway, creating one if none exist.
 * Corresponds to GET /agent/conversations/get-or-create-conversations-from-agent?agent_id=... in API Gateway
 * 
 * @param params - Object containing the agentId.
 * @param externalApiServiceCredentials - Credentials containing platformClientUserId and platformApiKey.
 * @returns A promise resolving to the ServiceResponse containing the list of conversations.
 */
export const getMessagesFromConversationExternalApiService = async (
    params: { conversationId: string }, 
    agentBaseCredentials: AgentBaseCredentials
): Promise<ServiceResponse<Message[]>> => {
    const AGENT_BASE_API_URL = getAgentBaseApiUrl();
    const { conversationId } = params;
    const endpoint = `${AGENT_SERVICE_ROUTE_PREFIX}/message/get-messages-from-conversation`;
    const queryParams = { conversationId }; 

    return makeAgentBaseRequest<Message[]>( 
        AGENT_BASE_API_URL,
        'GET',
        endpoint,
        agentBaseCredentials,
        undefined, // No body for GET
        queryParams // Pass query params here
    );
};
