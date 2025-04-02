/**
 * Database Service Client
 * 
 * Functions for interacting with the database-service microservice.
 */
import axios from 'axios';
import {
    AgentRecord,
    MessageRecord,
    SaveMessageInput,
    GetMessagesResponse
} from '@agent-base/agents';

// Ensure the URL points to the correct database service port (e.g., 3006)
const DATABASE_SERVICE_URL = process.env.DATABASE_SERVICE_URL || 'http://localhost:3006';

/**
 * Fetches agent details from the database service.
 * @param userId - The ID of the user making the request.
 * @param agentId - The ID of the agent to fetch.
 * @returns The AgentRecord if found and authorized.
 * @throws Error if agent not found, access denied, or request fails.
 */
export async function getAgentDetails(userId: string, agentId: string): Promise<AgentRecord> {
    try {
        const response = await axios.get<{ success: boolean, data?: AgentRecord }>(
            `${DATABASE_SERVICE_URL}/agents/get-user-agent`, 
            { params: { user_id: userId, agent_id: agentId } } 
        );

        if (!response.data.success || !response.data.data) {
            throw new Error('Agent not found or access denied');
        }
        return response.data.data;
    } catch (error) {
        console.error(`[DB Service Client] Error fetching agent details for agent ${agentId}:`, error);
        // Re-throw or handle specific axios errors if needed
        throw new Error(`Failed to fetch agent details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Fetches conversation history from the database service.
 * @param userId - The ID of the user.
 * @param conversationId - The ID of the conversation.
 * @returns An array of MessageRecords.
 * @throws Error if the request fails.
 */
export async function getConversationHistory(userId: string, conversationId: string): Promise<MessageRecord[]> {
    try {
        const response = await axios.get<GetMessagesResponse>(
            `${DATABASE_SERVICE_URL}/messages`, 
            { params: { user_id: userId, conversation_id: conversationId } }
        );

        if (!response.data.success) {
            // Log error but return empty array if history fetch fails but isn't critical
            console.error(`[DB Service Client] Error fetching history for conversation ${conversationId}: ${response.data.error}`);
            return []; 
        }
        // Ensure data is an array, return empty array if not
        return Array.isArray(response.data.data) ? response.data.data : []; 
    } catch (error) {
        console.error(`[DB Service Client] Network error fetching history for conversation ${conversationId}:`, error);
        // Depending on requirements, could throw or return empty
        // Returning empty allows conversation to proceed without history
        return []; 
    }
}

/**
 * Saves a message to the database service.
 * @param messageData - The message data to save.
 * @throws Error if the save operation fails.
 */
export async function saveMessage(messageData: SaveMessageInput): Promise<void> {
    try {
        const response = await axios.post<{ success: boolean, error?: string }>(
            `${DATABASE_SERVICE_URL}/messages`, 
            messageData
        );

        if (!response.data.success) {
            throw new Error(`Failed to save message: ${response.data.error || 'Unknown database error'}`);
        }
        console.log(`[DB Service Client] Message saved successfully for conv ${messageData.conversation_id}`);
    } catch (error) {
        console.error(`[DB Service Client] Error saving message for conv ${messageData.conversation_id}:`, error);
        // Re-throw or handle specific axios errors
        throw new Error(`Failed to save message: ${error instanceof Error ? error.message : 'Network error'}`);
    }
} 