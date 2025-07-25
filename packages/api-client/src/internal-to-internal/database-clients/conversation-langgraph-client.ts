/**
 * API Client for Database Service - LangGraph Conversations
 *
 * This file contains functions to interact with the LangGraph conversation-related endpoints
 * of the database service. These are intended for internal use by other services
 * within the agent-base backend, abstracting the direct HTTP calls.
 */
import {
    AgentId,
    Conversation,
    ServiceResponse,
    ConversationId,
    CreateConversationInput,
    UpdateConversationLanggraphInput,
} from '@agent-base/types';
import { makeInternalRequest } from '../../utils/service-client.js';
import { getDatabaseServiceUrl } from '../../utils/config.js';

// ==============================================================================
// == Internal API Service Calls to Database Service for LANGGRAPH CONVERSATIONS
// ==============================================================================

/**
 * Retrieves or creates LangGraph conversations for a specific agent from the database service.
 */
export const getOrCreateConversationsLangGraphInternalApiService = async (
    params: AgentId,
    clientUserId: string, 
    clientOrganizationId: string,
    platformUserId: string, 
    platformApiKey: string
): Promise<ServiceResponse<Conversation[]>> => {
    return makeInternalRequest<Conversation[]>(
        getDatabaseServiceUrl(),
        'GET',
        '/conversations-langgraph/get-or-create-conversations-from-agent-langgraph',
        platformUserId,
        clientUserId,
        clientOrganizationId,
        platformApiKey,
        undefined, 
        params 
    );
};

/**
 * Creates a new LangGraph conversation in the database service.
 */
export const createConversationLangGraphInternalApiService = async (
    data: CreateConversationInput, 
    clientUserId: string, 
    clientOrganizationId: string,
    platformUserId: string, 
    platformApiKey: string
): Promise<ServiceResponse<Conversation>> => {
    return makeInternalRequest<Conversation>(
        getDatabaseServiceUrl(),
        'POST',
        '/conversations-langgraph/create-conversation-langgraph',
        platformUserId,
        clientUserId,
        clientOrganizationId,
        platformApiKey,
        data, 
        undefined 
    );
};


/**
 * Fetches a specific LangGraph conversation by its ID from the database service.
 */
export const getConversationByIdLangGraphInternalApiService = async (
    params: ConversationId,
    clientUserId: string, 
    clientOrganizationId: string,
    platformUserId: string, 
    platformApiKey: string
): Promise<ServiceResponse<Conversation>> => {
    return makeInternalRequest<Conversation>(
        getDatabaseServiceUrl(),
        'GET',
        `/conversations-langgraph/get-conversation-langgraph/${params.conversationId}`,
        platformUserId,
        clientUserId,
        clientOrganizationId,
        platformApiKey,
        undefined, 
        undefined 
    );
};


/**
 * Fetches all LangGraph conversations for a given client_user_id from the database service.
 */
export const getAllUserConversationsFromDbServiceLangGraph = async (
    params: { clientUserId: string }, 
    clientUserId: string,      
    clientOrganizationId: string,
    platformUserId: string,
    platformApiKey: string
): Promise<ServiceResponse<Conversation[]>> => {
    if (!params.clientUserId) {
        throw new Error('clientUserId query parameter is required to fetch all user conversations.');
    }
    if (!clientUserId || !clientOrganizationId || !platformUserId || !platformApiKey) {
        throw new Error('Authentication details (clientAuthUserId, clientAuthOrganizationId, platformUserId, platformApiKey) are required.');
    }

    return makeInternalRequest<Conversation[]>(
        getDatabaseServiceUrl(),
        'GET',
        '/conversations-langgraph/get-all-user-conversations-langgraph', 
        platformUserId,       
        clientUserId,     
        clientOrganizationId,
        platformApiKey,       
        undefined,            
        { clientUserId: params.clientUserId } 
    );
};

/**
 * Updates an existing LangGraph conversation's messages in the database service.
 */
export const updateConversationLangGraphInternalApiService = async (
    data: UpdateConversationLanggraphInput,
    clientUserId: string, 
    clientOrganizationId: string,
    platformUserId: string, 
    platformApiKey: string
): Promise<ServiceResponse<ConversationId>> => {
    if (!data.conversationId || !data.messages) {
        throw new Error('conversationId and messages are required for updating a conversation.');
    }
    return makeInternalRequest<ConversationId>(
        getDatabaseServiceUrl(),
        'POST',
        '/conversations-langgraph/update-conversation-langgraph',
        platformUserId,
        clientUserId,
        clientOrganizationId,
        platformApiKey,
        data,
        undefined
    );
};

/**
 * Fetches all LangGraph conversations for a given platform_user_id from the database service.
 */
export const getAllPlatformUserConversationsFromDbServiceLangGraph = async (
    params: { platformUserId: string },
    clientUserId: string,
    clientOrganizationId: string,
    platformUserIdAuth: string,
    platformApiKey: string
): Promise<ServiceResponse<Conversation[]>> => {
    if (!params.platformUserId) {
        throw new Error('platformUserId query parameter is required to fetch all user conversations.');
    }
    if (!clientUserId || !clientOrganizationId || !platformUserIdAuth || !platformApiKey) {
        throw new Error('Authentication details (clientUserId, clientOrganizationId, platformUserId, platformApiKey) are required.');
    }

    return makeInternalRequest<Conversation[]>(
        getDatabaseServiceUrl(),
        'GET',
        '/conversations-langgraph/get-all-platform-user-conversations-langgraph',
        params.platformUserId,
        clientUserId,
        clientOrganizationId,
        platformApiKey,
        undefined,
        undefined
    );
}; 