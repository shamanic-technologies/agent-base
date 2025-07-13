/**
 * API Client for Database Service - Conversations
 *
 * This file contains functions to interact with the conversation-related endpoints
 * of the database service. These are intended for internal use by other services
 * within the agent-base backend, abstracting the direct HTTP calls.
 */
import {
    AgentId,
    Conversation,
    ServiceResponse,
    ConversationId,
    CreateConversationInput,
} from '@agent-base/types';
import { makeInternalRequest } from '../../utils/service-client.js';
import { getDatabaseServiceUrl } from '../../utils/config.js';

// ==============================================================================
// == Internal API Service Calls to Database Service for CONVERSATIONS
// ==============================================================================

/**
 * Retrieves or creates conversations for a specific agent from the database service.
 * This is an internal API call.
 * @param params - Object containing agentId.
 * @param clientUserId - The client user ID for authentication.
 * @param platformUserId - The platform user ID for authentication.
 * @param platformApiKey - The platform API key for authentication.
 * @returns A promise that resolves to the service response containing an array of conversations.
 */
export const getOrCreateConversationsInternalApiService = async (
    params: AgentId, // Original type was AgentId { agentId: string }
    clientUserId: string, 
    clientOrganizationId: string,
    platformUserId: string, 
    platformApiKey: string
): Promise<ServiceResponse<Conversation[]>> => {
    return makeInternalRequest<Conversation[]>(
        getDatabaseServiceUrl(),
        'GET',
        '/conversations/get-or-create-conversations-from-agent',
        platformUserId,
        clientUserId,
        clientOrganizationId,
        platformApiKey,
        undefined, 
        params 
    );
};

/**
 * Creates a new conversation in the database service.
 * This is an internal API call.
 * @param data - The conversation data to create.
 * @param clientUserId - The client user ID for authentication.
 * @param platformUserId - The platform user ID for authentication.
 * @param platformApiKey - The platform API key for authentication.
 * @returns A promise that resolves to the service response containing the ID of the created conversation.
 */
export const createConversationInternalApiService = async (
    data: CreateConversationInput, 
    clientUserId: string, 
    clientOrganizationId: string,
    platformUserId: string, 
    platformApiKey: string
): Promise<ServiceResponse<Conversation>> => {
    return makeInternalRequest<Conversation>(
        getDatabaseServiceUrl(),
        'POST',
        '/conversations/create-conversation',
        platformUserId,
        clientUserId,
        clientOrganizationId,
        platformApiKey,
        data, 
        undefined 
    );
};


/**
 * Fetches a specific conversation by its ID from the database service.
 * This is an internal API call.
 * @param params - Object containing conversationId.
 * @param clientUserId - The client user ID for authentication.
 * @param platformUserId - The platform user ID for authentication.
 * @param platformApiKey - The platform API key for authentication.
 * @returns A promise that resolves to the service response containing the conversation.
 */
export const getConversationByIdInternalApiService = async (
    params: ConversationId,
    clientUserId: string, 
    clientOrganizationId: string,
    platformUserId: string, 
    platformApiKey: string
): Promise<ServiceResponse<Conversation>> => {
    return makeInternalRequest<Conversation>(
        getDatabaseServiceUrl(),
        'GET',
        `/conversations/get-conversation/${params.conversationId}`,
        platformUserId,
        clientUserId,
        clientOrganizationId,
        platformApiKey,
        undefined, 
        undefined 
    );
};


/**
 * Fetches all conversations for a given client_user_id from the database service.
 * This is an internal API call.
 * @param params - Object containing clientUserId (the ID to fetch conversations for).
 * @param clientUserIdAuth - The client user ID for authentication context (passed in header).
 * @param platformUserId - The platform user ID for authentication.
 * @param platformApiKey - The platform API key for authentication.
 * @returns A promise that resolves to the service response containing an array of conversations.
 */
export const getAllUserConversationsFromDbService = async (
    params: { clientUserId: string }, 
    clientUserId: string,      
    clientOrganizationId: string,
    platformUserId: string,
    platformApiKey: string
): Promise<ServiceResponse<Conversation[]>> => {
    if (!params.clientUserId) {
        // Consider returning a ServiceResponse with success: false and an error message
        // For now, throwing an error which will be caught by the caller or break if unhandled.
        throw new Error('clientUserId query parameter is required to fetch all user conversations.');
    }
    if (!clientUserId || !clientOrganizationId || !platformUserId || !platformApiKey) {
        throw new Error('Authentication details (clientAuthUserId, clientAuthOrganizationId, platformUserId, platformApiKey) are required.');
    }

    return makeInternalRequest<Conversation[]>(
        getDatabaseServiceUrl(),
        'GET',
        '/conversations/get-all-user-conversations', 
        platformUserId,       
        clientUserId,     
        clientOrganizationId,
        platformApiKey,       
        undefined,            
        { clientUserId: params.clientUserId } 
    );
};

/**
 * Updates an existing conversation's messages in the database service.
 * This is an internal API call.
 * @param data - The data containing conversationId and messages to update.
 * @param clientUserId - The client user ID for authentication.
 * @param platformUserId - The platform user ID for authentication.
 * @param platformApiKey - The platform API key for authentication.
 * @returns A promise that resolves to the service response containing the ID of the updated conversation.
 */
export const updateConversationInternalApiService = async (
    data: { conversationId: string; messages: any[] }, // Assuming messages type, adjust if UpdateConversationInput is defined and different
    clientUserId: string, 
    clientOrganizationId: string,
    platformUserId: string, 
    platformApiKey: string
): Promise<ServiceResponse<ConversationId>> => { // Database route returns ConversationId upon successful update
    if (!data.conversationId || !data.messages) {
        throw new Error('conversationId and messages are required for updating a conversation.');
    }
    return makeInternalRequest<ConversationId>(
        getDatabaseServiceUrl(),
        'POST',
        '/conversations/update-conversation', // The endpoint for updating conversations
        platformUserId,
        clientUserId,
        clientOrganizationId,
        platformApiKey,
        data, // Request Body containing conversation_id and messages
        undefined // No Query Params
    );
};



