/**
 * Database Service Client - Conversation Functions
 * 
 * Functions for interacting with conversation-related endpoints in the database-service.
 */
import axios from 'axios';
import {
    GetConversationsResponse,
    GetConversationResponse,
    BaseResponse,
} from '@agent-base/agents'; // Shared types for payloads
// @ts-ignore - Message not directly exported from 'ai' in this context
import { Message } from 'ai';
import { handleAxiosError } from '../lib/utils/errorHandlers.js'; // Assuming path

// Consider moving this to a shared config/constants file
const DATABASE_SERVICE_URL = process.env.DATABASE_SERVICE_URL || 'http://localhost:3006';

/**
 * Retrieves existing conversations for an agent or creates a new default one.
 * Returns ServiceResponse<GetConversationsResponse>
 */
export async function getOrCreateConversationsFromAgent(agentId: string, userId: string): Promise<GetConversationsResponse> {
    try {
        // Assuming the DB service endpoint directly returns a structure that matches GetConversationsResponse
        // AND includes a top-level 'success' boolean.
        const response = await axios.get<GetConversationsResponse>(
            `${DATABASE_SERVICE_URL}/conversations/get-or-create-conversations-from-agent`,
            {
                params: { agent_id: agentId },
                headers: { 'x-user-id': userId }
            }
        );  
        console.log('[Agent Service] DB Conversations response:', JSON.stringify(response.data, null, 2));
        if (response.data?.success) {
            // Return the data part which should match GetConversationsResponse
             return response.data;
        } else {
            const errorMsg = response.data?.error || 'Failed to get/create conversations.';
            console.warn(`[Service: Database Convo] Failed operation for agent ${agentId}: ${errorMsg}`);
            return { success: false, error: String(errorMsg) }; 
        }
    } catch (error) {
        // Log the formatted error instead of the raw error object
        const formattedError = handleAxiosError(error, 'Database Service (Get/Create Convos)');
        console.error(`[Service: Database Convo] Error calling get-or-create-conversations endpoint for agent ${agentId}:`, formattedError);
        return { success: false, error: formattedError.message };
    }
}

/**
 * Retrieves a single conversation by its ID from the database service.
 * Returns ServiceResponse<GetConversationResponse>
 */
export async function getConversationById(conversationId: string, userId: string): Promise<GetConversationResponse> {
    try {
        // Assuming the DB service endpoint directly returns a structure that matches GetConversationResponse
        // AND includes a top-level 'success' boolean.
        const response = await axios.get<GetConversationResponse>(
            `${DATABASE_SERVICE_URL}/conversations/get-conversation/${conversationId}`,
            {
                headers: { 'x-user-id': userId }
            }
        );
        
        if (response.data?.success) {
            return response.data;
        } else {
             const errorMsg = response.data?.error || 'Failed to get conversation.';
            console.warn(`[Service: Database Convo] Failed operation for conversation ${conversationId}: ${errorMsg}`);
            return { success: false, error: String(errorMsg) }; 
        }   
    } catch (error) {
        // Log the formatted error instead of the raw error object
        const formattedError = handleAxiosError(error, 'Database Service (Get Convo)');
        console.error(`[Service: Database Convo] Error calling get-conversation endpoint for conversation ${conversationId}:`, formattedError);
        return { success: false, error: formattedError.message };
    }
}

/**
 * Updates the messages array for a conversation in the database service.
 * Returns ServiceResponse<BaseResponse> - Assuming BaseResponse contains { success: boolean, ... }
 */
export async function updateConversationMessagesInDb(
    conversationId: string,
    messages: Message[],
    userId: string
): Promise<BaseResponse> { 
    try {
        // Assuming the endpoint returns BaseResponse structure which includes { success: boolean }
        const response = await axios.post<BaseResponse>(
            `${DATABASE_SERVICE_URL}/conversations/update-conversation`,
            { 
                conversation_id: conversationId,
                messages: messages
            },
            {
                headers: { 'x-user-id': userId }
            }
        );
        
        // Pass the whole BaseResponse as data if successful
        if (response.data.success) {
            return response.data;
        } else {
            const errorMsg = (response.data as any).error || 'Failed to update conversation.'; // Added type assertion for error
            console.warn(`[Service: Database Convo] Failed update for conversation ${conversationId}: ${errorMsg}`);
            return { success: false, error: String(errorMsg) };
        }
    } catch (error) {
        // Log the formatted error instead of the raw error object
        const formattedError = handleAxiosError(error, 'Database Service (Update Convo)');
        console.error(`[Service: Database Convo] Error calling update-conversation endpoint for conversation ${conversationId}:`, formattedError);
        return { success: false, error: formattedError.message };
    }
} 