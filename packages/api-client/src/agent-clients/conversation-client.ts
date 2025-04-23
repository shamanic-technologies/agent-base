/**
 * API Client functions for interacting with the Agent Service conversation endpoints VIA THE API GATEWAY.
 */
import { 
    ServiceResponse, 
    Conversation, 
    CreateConversationInput, 
    ConversationId,
    ExternalApiServiceCredentials // Import credentials type
} from '@agent-base/types';
import { makeExternalAPIServiceRequest } from '../utils/service-client'; // Use the external request helper
import { getApiGatewayServiceUrl } from '../utils/config'; // Target API Gateway

const API_GATEWAY_URL = getApiGatewayServiceUrl();
const AGENT_SERVICE_ROUTE_PREFIX = '/agent'; // Assuming API Gateway prefixes agent routes with /agent

/**
 * Fetches conversations for a specific agent via API Gateway, creating one if none exist.
 * Corresponds to GET /agent/conversations/get-or-create-conversations-from-agent?agent_id=... in API Gateway
 * 
 * @param params - Object containing the agentId.
 * @param externalApiServiceCredentials - Credentials containing platformClientUserId and platformApiKey.
 * @returns A promise resolving to the ServiceResponse containing the list of conversations.
 */
export const getOrCreateConversationsExternalApiService = async (
    params: { agentId: string }, 
    externalApiServiceCredentials: ExternalApiServiceCredentials
): Promise<ServiceResponse<Conversation[]>> => {
    const { agentId } = params;
    const endpoint = `${AGENT_SERVICE_ROUTE_PREFIX}/conversation/get-or-create-conversations-from-agent`;
    const queryParams = { agentId }; 

    console.log(`[API Client] Calling API Gateway: GET ${API_GATEWAY_URL}${endpoint}`);

    return makeExternalAPIServiceRequest<Conversation[]>( 
        API_GATEWAY_URL,
        'GET',
        endpoint,
        externalApiServiceCredentials,
        undefined, // No body for GET
        queryParams // Pass query params here
    );
};

/**
 * Creates a new conversation record via the API Gateway.
 * Corresponds to POST /agent/conversations/create-conversation in API Gateway
 * 
 * @param body - The input data for creating the conversation (agentId, channelId, conversationId).
 * @param externalApiServiceCredentials - Credentials containing platformClientUserId and platformApiKey.
 * @returns A promise resolving to the ServiceResponse containing the ID of the created conversation.
 */
export const createConversationExternalApiService = async (
    body: CreateConversationInput,
    externalApiServiceCredentials: ExternalApiServiceCredentials
): Promise<ServiceResponse<ConversationId>> => {
    const endpoint = `${AGENT_SERVICE_ROUTE_PREFIX}/conversation/create-conversation`;

    console.log(`[API Client] Calling API Gateway: POST ${API_GATEWAY_URL}${endpoint}`);
    
    return makeExternalAPIServiceRequest<ConversationId>( 
        API_GATEWAY_URL,
        'POST',
        endpoint,
        externalApiServiceCredentials,
        body, // Pass body here
        undefined // No query params for POST
    );
};
