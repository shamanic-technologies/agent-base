/**
 * Database Service Client
 * 
 * Functions for interacting with the database-service microservice.
 */
import axios from 'axios';
import {
    AgentRecord,
    MessageRecord,
    CreateMessageInput,
    CreateMessageResponse,
    GetMessagesResponse,
    GetMessagesInput
} from '@agent-base/agents';

// Ensure the URL points to the correct database service port (e.g., 3006)
const DATABASE_SERVICE_URL = process.env.DATABASE_SERVICE_URL || 'http://localhost:3006';

/**
 * Fetches agent details from the database service.
 * Renamed from getAgentDetails
 */
export async function getUserAgent(userId: string, agentId: string): Promise<AgentRecord> {
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
        console.error(`[Agent Service DB Client] Error fetching agent details for agent ${agentId}:`, error);
        throw new Error(`Failed to fetch agent details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Retrieves conversation messages for a given conversation.
 * Renamed from getConversationHistory
 */
export async function getConversationMessages(conversationId: string): Promise<MessageRecord[]> {
  try {
    console.log(`[Agent Service DB Client] Calling DB service to get messages for conv ${conversationId}`);
    const paramsInput: GetMessagesInput = { conversation_id: conversationId };
    const response = await axios.get<GetMessagesResponse>(
        `${DATABASE_SERVICE_URL}/messages/get_conversation_messages`, { 
            params: paramsInput
        }
    );

    if (!response.data.success) {
      console.warn(`[Agent Service DB Client] Failed to get messages from DB service (success: false):`, response.data.error);
      return [];
    }
    
    console.log(`[Agent Service DB Client] Messages retrieved, count: ${response.data.data?.length ?? 0}`);
    return response.data.data ?? [];

  } catch (error) {
    console.error(`[Agent Service DB Client] Error calling database service to get messages:`, error);
    return []; 
  }
}

/**
 * Creates a message in the database service.
 */
export async function createMessage(input: CreateMessageInput): Promise<CreateMessageResponse> {
  try {
    console.log(`[Agent Service DB Client] Calling DB service to create message for conv ${input.conversation_id}, role ${input.role}`);
    const response = await axios.post<CreateMessageResponse>(
        `${DATABASE_SERVICE_URL}/messages/create-message`, 
        input 
    );

    if (!response.data.success) {
        console.error('[Agent Service DB Client] Database service failed to create message:', response.data.error);
        throw new Error(response.data.error || 'Database service failed to create message');
    }
    console.log(`[Agent Service DB Client] Message created via DB service.`);
    return response.data;

  } catch (error) {
    console.error('[Agent Service DB Client] Error calling database service to create message:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create message: ${errorMessage}`);
  }
}