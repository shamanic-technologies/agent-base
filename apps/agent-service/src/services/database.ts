/**
 * Database Service Client
 * 
 * Functions for interacting with the database-service microservice.
 */
import axios from 'axios';
import {
    AgentRecord,
    GetConversationsResponse,
    GetConversationResponse,
    BaseResponse,
} from '@agent-base/agents';
// Import Message from 'ai'
// @ts-ignore - Message not directly exported from 'ai' in this context
import { Message } from 'ai';

// Ensure the URL points to the correct database service port (e.g., 3006)
const DATABASE_SERVICE_URL = process.env.DATABASE_SERVICE_URL || 'http://localhost:3006';

/**
 * Fetches agent details for a specific conversation from the database service.
 */
export async function getAgentFromConversation(conversationId: string, userId: string): Promise<AgentRecord> {
    try {
        console.log(`[Agent Service DB Client] Fetching agent for conversation ${conversationId}`);
        const response = await axios.get<{ success: boolean, data?: AgentRecord }>(
            `${DATABASE_SERVICE_URL}/agents/get-conversation-agent`, 
            { params: { conversation_id: conversationId },
              headers: {
                'x-user-id': userId
              }
            } 
        );

        if (!response.data.success || !response.data.data) {
            throw new Error('Agent not found for this conversation');
        }
        
        console.log(`[Agent Service DB Client] Successfully retrieved agent for conversation ${conversationId}`);
        return response.data.data;
    } catch (error) {
        console.error(`[Agent Service DB Client] Error fetching agent for conversation ${conversationId}:`, error);
        throw new Error(`Failed to fetch agent for conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Fetches agent details from the database service.
 * Renamed from getAgentDetails
 */
export async function getUserAgent(userId: string, agentId: string): Promise<AgentRecord> {
    try {
        const response = await axios.get<{ success: boolean, data?: AgentRecord }>(
            `${DATABASE_SERVICE_URL}/agents/get-user-agent`, 
            { params: { user_id: userId, agent_id: agentId },
              headers: {
                'x-user-id': userId
              }
            } 
        );

        if (!response.data.success || !response.data.data) {
            throw new Error('Agent not found or access denied');
        }
        return response.data.data;
    } catch (error) {
        console.error(`[Agent Service DB Client] Error fetching agent details for agent ${agentId}:`, error);
        throw new Error(`Failed to fetch agent details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Retrieves existing conversations for an agent or creates a new default one.
 */
export async function getOrCreateConversationsFromAgent(agentId: string, userId: string): Promise<GetConversationsResponse> {
    console.log(`[Agent Service DB Client] Requesting conversations (or creation) for agent ${agentId} from database service.`);
    try {
        const response = await axios.get<GetConversationsResponse>(
            `${DATABASE_SERVICE_URL}/conversations/get-or-create-conversations-from-agent`,
            {
                params: { agent_id: agentId },
                headers: { 'x-user-id': userId } // Pass user ID
            }
        );
        console.log(`[Agent Service DB Client] Received response from get-or-create. Success: ${response.data.success}`);
        // Return the whole response data structure from the DB service
        return response.data; 
    } catch (error) {
        console.error(`[Agent Service DB Client] Error calling get-or-create-conversations endpoint for agent ${agentId}:`, error);
        // Rethrow a structured error or a generic one
        if (axios.isAxiosError(error) && error.response) {
            // Throw an error with details from the database service response if available
            throw new Error(`Database service error (${error.response.status}): ${error.response.data?.error || error.message}`);
        } else {
            // Throw a generic error for other issues (network, etc.)
            throw new Error(`Failed to get or create conversations: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}

/**
 * Retrieves a single conversation by its ID from the database service.
 */
export async function getConversationById(conversationId: string, userId: string): Promise<GetConversationResponse> {
    console.log(`[Agent Service DB Client] Requesting single conversation ${conversationId} from database service.`);
    try {
        const response = await axios.get<GetConversationResponse>(
            // Use path parameter for conversation_id
            `${DATABASE_SERVICE_URL}/conversations/get-conversation/${conversationId}`,
            {
                headers: { 'x-user-id': userId } // Pass user ID for potential auth/logging
            }
        );
        console.log(`[Agent Service DB Client] Received response for single conversation ${conversationId}. Success: ${response.data.success}`);
        // Return the whole response data structure from the DB service
        return response.data;
    } catch (error) {
        console.error(`[Agent Service DB Client] Error calling get-conversation endpoint for conversation ${conversationId}:`, error);
        if (axios.isAxiosError(error) && error.response) {
            throw new Error(`Database service error (${error.response.status}): ${error.response.data?.error || error.message}`);
        } else {
            throw new Error(`Failed to get conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}

/**
 * Updates the messages array for a conversation in the database service.
 */
export async function updateConversationMessagesInDb(
    conversationId: string, 
    messages: Message[],
    userId: string
): Promise<BaseResponse> {
    console.log(`[Agent Service DB Client] Updating messages for conversation ${conversationId} in database service.`);
    try {
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
        console.log(`[Agent Service DB Client] Received response from update-conversation. Success: ${response.data.success}`);
        // Return the response data structure from the DB service
        return response.data;
    } catch (error) {
        console.error(`[Agent Service DB Client] Error calling update-conversation endpoint for conversation ${conversationId}:`, error);
        if (axios.isAxiosError(error) && error.response) {
            // Rethrow with details from the database service response
            throw new Error(`Database service error (${error.response.status}) updating messages: ${error.response.data?.error || error.message}`);
        } else {
            throw new Error(`Failed to update messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
