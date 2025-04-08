/**
 * Database Service Client - Agent Functions
 * 
 * Functions for interacting with agent-related endpoints in the database-service.
 */
import axios from 'axios';
import { 
    AgentRecord, 
    CreateUserAgentInput, 
    UpdateUserAgentInput, 
    ListUserAgentsResponse, // Use for list response structure
    CreateUserAgentResponse, // Use for create response structure
    UpdateUserAgentResponse, // Use for update response structure
    GetUserAgentResponse // Use for get response structure
} from '@agent-base/agents'; // Import shared types
import { ServiceResponse } from '../types/index.js'; // Import local ServiceResponse
import { handleAxiosError } from '../lib/utils/errorHandlers.js'; // Assuming path

// Consider moving this to a shared config/constants file
const DATABASE_SERVICE_URL = process.env.DATABASE_SERVICE_URL || 'http://localhost:3006';

/**
 * Fetches agent details for a specific conversation from the database service.
 * Returns ServiceResponse<AgentRecord>
 */
export async function getAgentFromConversation(conversationId: string, userId: string): Promise<GetUserAgentResponse> {
    try {
        // Use specific response type from DB service if defined, else generic
        const response = await axios.get<GetUserAgentResponse>( 
            `${DATABASE_SERVICE_URL}/agents/get-conversation-agent`,
            { 
                params: { conversation_id: conversationId },
                headers: { 'x-user-id': userId }
            }
        );

        if (response.data?.success && response.data.data) {
            return { success: true, data: response.data.data };
        } else {
            const errorMsg = response.data?.error || 'Agent not found or database service returned failure.';
            console.warn(`[Service: Database Agent] Failed to get agent for conv ${conversationId}: ${errorMsg}`);
            return { success: false, error: String(errorMsg) }; 
        }
    } catch (error) {
        const formattedError = handleAxiosError(error, 'Database Service (Agent Conv Fetch)'); 
        console.error(`[Service: Database Agent] Error fetching agent for conversation ${conversationId}:`, formattedError);
        return { success: false, error: formattedError.message };
    }
}

/**
 * Fetches specific agent details from the database service by agent ID.
 * Returns ServiceResponse<AgentRecord>
 */
export async function getUserAgent(userId: string, agentId: string): Promise<GetUserAgentResponse> {
    try {
        // Use specific response type from DB service if defined, else generic
        const response = await axios.get<GetUserAgentResponse>( 
            `${DATABASE_SERVICE_URL}/agents/get-user-agent`,
            { 
                params: { user_id: userId, agent_id: agentId },
                headers: { 'x-user-id': userId }
            }
        );

        if (response.data?.success ) {
            return response.data;
        } else {
            const errorMsg = response.data?.error || 'Agent not found or database service returned failure.';
            console.warn(`[Service: Database Agent] Failed to get agent ${agentId}: ${errorMsg}`);
            return { success: false, error: String(errorMsg) }; 
        }
    } catch (error) {
        const formattedError = handleAxiosError(error, 'Database Service (Agent User Fetch)');
        console.error(`[Service: Database Agent] Error fetching agent details for agent ${agentId}:`, formattedError);
        return { success: false, error: formattedError.message };
    }
}

/**
 * Lists all agents for a specific user from the database service.
 * Returns ServiceResponse<AgentRecord[]>
 */
export async function listUserAgents(userId: string): Promise<ListUserAgentsResponse> {
    try {
        // Use the specific response type ListUserAgentsResponse
        const response = await axios.get<ListUserAgentsResponse>(
            `${DATABASE_SERVICE_URL}/agents/list-user-agents`,
            { 
                params: { user_id: userId },
                headers: { 'x-user-id': userId } 
            }
        );

        if (response.data?.success) {
            // Ensure data is always an array
            return response.data;
        } else {
            const errorMsg = response.data?.error || 'Failed to list agents or database service returned failure.';
            console.warn(`[Service: Database Agent] Failed to list agents for user ${userId}: ${errorMsg}`);
            // Return success: false but empty array for data consistency
            return { success: false, error: String(errorMsg), data: [] }; 
        }
    } catch (error) {
        const formattedError = handleAxiosError(error, 'Database Service (Agent List Fetch)');
        console.error(`[Service: Database Agent] Error listing agents for user ${userId}:`, formattedError);
        return { success: false, error: formattedError.message, data: [] };
    }
}

/**
 * Creates a new agent and links it to the user via the database service.
 * Returns ServiceResponse<AgentRecord>
 */
export async function createUserAgent(payload: CreateUserAgentInput): Promise<CreateUserAgentResponse> {
    try {

        // Use the specific response type CreateUserAgentResponse
        const response = await axios.post<CreateUserAgentResponse>(
            `${DATABASE_SERVICE_URL}/agents/create-user-agent`,
            payload,
            { // Send user ID in header for consistency, even if in payload
                params: { user_id: payload.user_id },
                headers: { 'x-user-id': payload.user_id }
            }
        );

        if (response.data?.success) {
            return response.data;
        } else {
            const errorMsg = response.data?.error || 'Agent creation failed or database service returned failure.';
            console.error(`[Service: Database Agent] Failed to create agent for user ${payload.user_id}: ${errorMsg}`);
            return { success: false, error: String(errorMsg) }; 
        }
    } catch (error) {
        const formattedError = handleAxiosError(error, 'Database Service (Agent Create)');
        console.error(`[Service: Database Agent] Error creating agent for user ${payload.user_id}:`, formattedError);
        return { success: false, error: formattedError.message };
    }
}

/**
 * Updates an existing agent via the database service.
 * Returns ServiceResponse<AgentRecord>
 */
export async function updateUserAgent(payload: UpdateUserAgentInput): Promise<UpdateUserAgentResponse> {
    try {
        // Use the specific response type UpdateUserAgentResponse
        const response = await axios.post<UpdateUserAgentResponse>(
            `${DATABASE_SERVICE_URL}/agents/update-user-agent`,
            payload,
            { // Add headers with user ID for ownership check in DB service
                params: { user_id: payload.user_id },
                headers: { 'x-user-id': payload.user_id }
            }
        );

        if (response.data?.success) {
            return response.data;
        } else {
            const errorMsg = response.data?.error || 'Agent update failed or database service returned failure.';
            console.error(`[Service: Database Agent] Failed to update agent ${payload.agent_id} for user ${payload.user_id}: ${errorMsg}`);
            return { success: false, error: String(errorMsg) }; 
        }
    } catch (error) {
        const formattedError = handleAxiosError(error, 'Database Service (Agent Update)');
        console.error(`[Service: Database Agent] Error updating agent ${payload.agent_id} for user ${payload.user_id}:`, formattedError);
        return { success: false, error: formattedError.message };
    }
} 