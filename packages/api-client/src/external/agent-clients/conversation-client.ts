/**
 * API Client functions for interacting with the Agent Service conversation endpoints VIA THE API GATEWAY.
 */
import { 
    ServiceResponse, 
    Conversation, 
    CreateConversationInput, 
    ConversationId,
    InternalServiceCredentials,
    PlatformUserApiServiceCredentials, // Import credentials type
    ConversationRecord,
    ClientUserApiServiceCredentials
} from '@agent-base/types';
//@ts-ignore
import { Message } from 'ai'; // Import Message from 'ai'
import { makePlatformUserApiServiceRequest, makeClientUserApiServiceRequest } from '../../utils/service-client.js'; // Added .js
import { getAgentServiceUrl, getApiGatewayServiceUrl } from '../../utils/config.js'; // Added .js
import { Method } from 'axios';

const API_GATEWAY_URL = getApiGatewayServiceUrl();
const AGENT_SERVICE_ROUTE_PREFIX = '/agent'; // Assuming API Gateway prefixes agent routes with /agent

/**
 * Fetches conversations for a specific agent via API Gateway, creating one if none exist.
 * Corresponds to GET /agent/conversations/get-or-create-conversations-from-agent?agent_id=... in API Gateway
 * 
 * @param params - Object containing the agentId.
 * @param platformUserApiServiceCredentials - Credentials containing platformClientUserId and platformApiKey.
 * @returns A promise resolving to the ServiceResponse containing the list of conversations.
 */
export const getOrCreateConversationsPlatformUserApiService = async (
    params: { agentId: string }, 
    platformUserApiServiceCredentials: PlatformUserApiServiceCredentials
): Promise<ServiceResponse<Conversation[]>> => {
    const { agentId } = params;
    const endpoint = `${AGENT_SERVICE_ROUTE_PREFIX}/conversation/get-or-create-conversations-from-agent`;
    const queryParams = { agentId }; 

    return makePlatformUserApiServiceRequest<Conversation[]>( 
        API_GATEWAY_URL,
        'GET',
        endpoint,
        platformUserApiServiceCredentials,
        undefined, // No body for GET
        queryParams // Pass query params here
    );
};


/**
 * Creates a new conversation record via the API Gateway.
 * Corresponds to POST /agent/conversations/create-conversation in API Gateway
 * 
 * @param body - The input data for creating the conversation (agentId, channelId, conversationId).
 * @param platformUserApiServiceCredentials - Credentials containing platformClientUserId and platformApiKey.
 * @returns A promise resolving to the ServiceResponse containing the ID of the created conversation.
 */
export const createConversationExternalApiService = async (
    body: CreateConversationInput,
    platformUserApiServiceCredentials: PlatformUserApiServiceCredentials
): Promise<ServiceResponse<ConversationId>> => {
    const endpoint = `${AGENT_SERVICE_ROUTE_PREFIX}/conversation/create-conversation`;    
    return makePlatformUserApiServiceRequest<ConversationId>( 
        API_GATEWAY_URL,
        'POST',
        endpoint,
        platformUserApiServiceCredentials,
        body, // Pass body here
        undefined // No query params for POST
    );
};

/**
 * Creates a new conversation record via the API Gateway.
 * Corresponds to POST /agent/conversations/create-conversation in API Gateway
 * 
 * @param body - The input data for creating the conversation (agentId, channelId, conversationId).
 * @param platformUserApiServiceCredentials - Credentials containing platformClientUserId and platformApiKey.
 * @returns A promise resolving to the ServiceResponse containing the ID of the created conversation.
 */
export const getOrCreateConversationClientUserApiService = async (
    body: CreateConversationInput,
    clientUserApiServiceCredentials: ClientUserApiServiceCredentials
): Promise<ServiceResponse<ConversationId>> => {
    const endpoint = `${AGENT_SERVICE_ROUTE_PREFIX}/conversation/get-or-create-conversation`;    
    return makeClientUserApiServiceRequest<ConversationId>( 
        API_GATEWAY_URL,
        'POST',
        endpoint,
        clientUserApiServiceCredentials,
        body, // Pass body here
        undefined // No query params for POST
    );
};

