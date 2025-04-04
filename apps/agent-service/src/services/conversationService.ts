/**
 * Conversation Service Logic for Agent Service
 */
import axios from 'axios';
import { randomUUID } from 'crypto';
import {
    GetAgentCurrentConversationResponse,
    CreateConversationInput,
    CreateConversationResponse,
    ConversationRecord
} from '@agent-base/agents';

const DATABASE_SERVICE_URL = process.env.DATABASE_SERVICE_URL || 'http://localhost:3006';

/**
 * Gets the current conversation for an agent from the database service, 
 * or creates a new one if none exists.
 * Simplified logic without error simulation.
 * 
 * @param agentId The ID of the agent.
 * @returns The conversation record (containing conversation_id).
 * @throws Throws an error if the operation fails.
 */
export async function getOrCreateAgentConversation(agentId: string): Promise<ConversationRecord> {
    
    if (!agentId) {
        throw new Error('[Agent Service - Conv Service] agentId is required');
    }

    console.log(`[Agent Service - Conv Service] Getting or creating current conversation for agent ${agentId}`);

    // --- Step 1: Try to get the current conversation --- 
    let existingConversation: ConversationRecord | null = null;
    try {
        console.log(`[Agent Service - Conv Service] Attempting to GET current conversation from DB service...`);
        const getResponse = await axios.get<GetAgentCurrentConversationResponse>(
            `${DATABASE_SERVICE_URL}/conversations/get-agent-current-conversation`,
            { params: { agent_id: agentId } }
        );

        // Check if the DB service reported success
        if (!getResponse.data.success) {
            throw new Error(`DB Service failed to get conversation: ${getResponse.data.error || 'Unknown DB error'}`);
        }

        // If successful and data exists, store it and return later
        if (getResponse.data.data) {
            console.log(`[Agent Service - Conv Service] Found existing current conversation: ${getResponse.data.data.conversation_id}`);
            existingConversation = getResponse.data.data as ConversationRecord;
            return existingConversation; // Found it, we are done.
        } else {
            // Success was true, but data was null - means we need to create
            console.log(`[Agent Service - Conv Service] No existing conversation found (DB returned data:null). Proceeding to create.`);
        }

    } catch (getError: any) {
        // Handle network errors or unexpected errors during GET
        const errorMessage = axios.isAxiosError(getError)
          ? `DB GET Request Error: ${getError.response?.status} - ${getError.response?.data?.error || getError.message}`
          : getError.message;
        console.error('[Agent Service - Conv Service] Error during GET current conversation:', errorMessage);
        throw new Error(`Failed to get current conversation from DB: ${errorMessage}`);
    }

    // --- Step 2: Create a new conversation (Only reached if GET returned data:null) --- 
    console.log(`[Agent Service - Conv Service] Creating a new conversation via DB service...`);
    try {
        const createInput: CreateConversationInput = {
            conversation_id: randomUUID(),
            agent_id: agentId,
            channel_id: 'web' // Default channel
        };

        const createResponse = await axios.post<CreateConversationResponse>(
            `${DATABASE_SERVICE_URL}/conversations/create-conversation`,
            createInput
        );

        // Check if the DB service reported success
        if (!createResponse.data.success || !createResponse.data.data) {
             const errMsg = createResponse.data.error || 'DB service create endpoint returned no data';
             console.error('[Agent Service - Conv Service] DB service indicated failure or missing data during CREATE:', errMsg);
             throw new Error(`DB service failed to create conversation: ${errMsg}`);
        }

        // Creation successful
        console.log(`[Agent Service - Conv Service] Successfully created new conversation: ${createResponse.data.data.conversation_id}`);
        return createResponse.data.data as ConversationRecord;

    } catch (createError: any) {
        // Handle network errors or unexpected errors during POST
        const errorMsg = axios.isAxiosError(createError)
                         ? `DB POST Request Error: ${createError.response?.status} - ${createError.response?.data?.error || createError.message}`
                         : createError.message;
        console.error('[Agent Service - Conv Service] Error during CREATE new conversation:', errorMsg);
        throw new Error(`Failed to create conversation via DB: ${errorMsg}`);
    }
} 