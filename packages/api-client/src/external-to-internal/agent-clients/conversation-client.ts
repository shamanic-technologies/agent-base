/**
 * API Client functions for interacting with the Agent Service conversation endpoints VIA THE API GATEWAY.
 */
import { 
    ServiceResponse, 
    Conversation, 
    CreateConversationInput, 
    ConversationId,
    AgentBaseCredentials,
    MinimalInternalCredentials,
} from '@agent-base/types';
//@ts-ignore
import { Message } from 'ai'; // Import Message from 'ai'
import { makeAgentBaseRequest, makeMinimalInternalRequest } from '../../utils/service-client.js'; // Added .js
import { getAgentBaseApiUrl } from '../../utils/config.js'; // Added .js
import { Method } from 'axios';

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
    agentBaseCredentials: AgentBaseCredentials
): Promise<ServiceResponse<Conversation[]>> => {
    const AGENT_BASE_API_URL = getAgentBaseApiUrl();
    const { agentId } = params;
    const endpoint = `${AGENT_SERVICE_ROUTE_PREFIX}/conversation/get-or-create-conversations-from-agent`;
    const queryParams = { agentId }; 

    return makeAgentBaseRequest<Conversation[]>( 
        AGENT_BASE_API_URL,
        'GET',
        endpoint,
        agentBaseCredentials,
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
    agentBaseCredentials: AgentBaseCredentials
): Promise<ServiceResponse<ConversationId>> => {
    const AGENT_BASE_API_URL = getAgentBaseApiUrl();
    const endpoint = `${AGENT_SERVICE_ROUTE_PREFIX}/conversation/create-conversation`;    
    return makeAgentBaseRequest<ConversationId>( 
        AGENT_BASE_API_URL,
        'POST',
        endpoint,
        agentBaseCredentials,
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
    minimalInternalCredentials: MinimalInternalCredentials
): Promise<ServiceResponse<ConversationId>> => {
    const AGENT_BASE_API_URL = getAgentBaseApiUrl();
    const endpoint = `${AGENT_SERVICE_ROUTE_PREFIX}/conversation/get-or-create-conversation`;    
    return makeMinimalInternalRequest<ConversationId>( 
        AGENT_BASE_API_URL,
        'POST',
        endpoint,
        minimalInternalCredentials,
        body, // Pass body here
        undefined // No query params for POST
    );
};

/**
 * Fetches all conversations for the authenticated platform user via the API Gateway.
 * Corresponds to GET /agent/conversation/get-all-user-conversations in API Gateway
 * 
 * @param platformUserApiServiceCredentials - Credentials containing platformClientUserId and platformApiKey.
 * @returns A promise resolving to the ServiceResponse containing the list of all conversations for the user.
 */
export const getAllClientUserConversationsApiService = async (
    agentBaseCredentials: AgentBaseCredentials
): Promise<ServiceResponse<Conversation[]>> => {
    const AGENT_BASE_API_URL = getAgentBaseApiUrl();
    const endpoint = `${AGENT_SERVICE_ROUTE_PREFIX}/conversation/get-all-user-conversations`;

    return makeAgentBaseRequest<Conversation[]>(
        AGENT_BASE_API_URL,
        'GET',
        endpoint,
        agentBaseCredentials,
        undefined, // No body for GET
        undefined  // No query parameters for this specific endpoint
    );
};

/**
 * Fetches all conversations for the authenticated platform user via the API Gateway.
 * This is different from `getAllUserConversationsPlatformUserApiService` because it's based on platform_user_id, not client_user_id.
 * Corresponds to GET /agent/conversation/get-all-platform-user-conversations in API Gateway
 * 
 * @param agentBaseCredentials - Credentials containing platformClientUserId and platformApiKey.
 * @returns A promise resolving to the ServiceResponse containing the list of all conversations for the user.
 */
export const getAllPlatformUserConversationsApiService = async (
    agentBaseCredentials: AgentBaseCredentials
): Promise<ServiceResponse<Conversation[]>> => {
    const AGENT_BASE_API_URL = getAgentBaseApiUrl();
    const endpoint = `${AGENT_SERVICE_ROUTE_PREFIX}/conversation/get-all-platform-user-conversations`;

    return makeAgentBaseRequest<Conversation[]>(
        AGENT_BASE_API_URL,
        'GET',
        endpoint,
        agentBaseCredentials,
        undefined, // No body for GET
        undefined  // No query parameters for this specific endpoint
    );
};

