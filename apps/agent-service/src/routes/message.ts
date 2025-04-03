/**
 * Message routes within Agent Service
 * 
 * Handles retrieving messages, potentially based on agent context.
 */
import { Router, Request, Response, NextFunction } from 'express';
import axios from 'axios';
import {
    // Import necessary types
    ConversationRecord,
    GetAgentCurrentConversationResponse,
    GetMessagesResponse,
    GetAgentCurrentConversationMessagesResponse,
    MessageRecord
} from '@agent-base/agents';

const router = Router();
const DATABASE_SERVICE_URL = process.env.DATABASE_SERVICE_URL || 'http://localhost:3006';

/**
 * Get messages for the current conversation of a given agent and user, 
 * OR for a specific conversation if conversation_id is provided.
 */
router.get('/get-agent-current-conversation-messages', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Extract user ID from auth middleware
        const userId = (req as any).user?.id as string;
        // Extract optional agent ID and conversation ID from query params
        const agentId = req.query.agent_id as string; 
        const conversationIdFromQuery = req.query.conversation_id as string; 

        // --- Validation --- 
        if (!userId) {
            res.status(401).json({ success: false, error: 'User authentication required' });
            return;
        }
        // Need EITHER agent_id (to find the current conversation) OR conversation_id (to fetch specific one)
        if (!agentId && !conversationIdFromQuery) {
            res.status(400).json({ success: false, error: 'agent_id or conversation_id query parameter is required' });
            return;
        }
        // --- End Validation --- 

        let conversationIdToUse: string | undefined = conversationIdFromQuery;

        // --- Determine Conversation ID --- 
        // If no specific conversation_id was provided via query param, find the current one for the agent
        if (!conversationIdToUse && agentId) {
            console.log(`[Agent Service /msg] No conversation_id in query, finding current for agent ${agentId}`);
            try {
                const convResponse = await axios.get<{ success: boolean, data?: { conversation_id: string } | null }>(
                    `${DATABASE_SERVICE_URL}/conversations/get-agent-current-conversation`, 
                    { params: { agent_id: agentId } } // Correct path and params
                );

                if (convResponse.data.success && convResponse.data.data?.conversation_id) {
                    conversationIdToUse = convResponse.data.data.conversation_id;
                    console.log(`[Agent Service /msg] Found current conversation ID: ${conversationIdToUse}`);
                } else {
                    // No current conversation exists for this agent
                    console.log(`[Agent Service /msg] No current conversation found for agent ${agentId}. Returning empty messages.`);
                    res.status(200).json({ success: true, data: [] }); // Return empty array, success
                    return;
                }
            } catch (dbError: any) {
                // Handle errors specifically from the conversation lookup call
                console.error(`[Agent Service /msg] DB Error finding current conversation for agent ${agentId}:`, dbError.message);
                const status = dbError.response?.status || 500;
                const message = dbError.response?.data?.error || 'Failed to get current conversation info';
                res.status(status).json({ success: false, error: message });
                return; // Stop execution if we can't find the conversation ID
            }
        }
        // --- End Determine Conversation ID --- 

        // If we still don't have a conversation ID, something went wrong
        if (!conversationIdToUse) {
            // This case should ideally not be reached due to initial validation and lookup logic
            console.error("[Agent Service /msg] Failed to determine conversation ID.");
            res.status(400).json({ success: false, error: 'Could not determine conversation ID to fetch messages for.' });
            return;
        }

        // --- Fetch Messages for the Determined Conversation ID --- 
        console.log(`[Agent Service /msg] Calling DB service /messages/get-conversation-messages for conversation ${conversationIdToUse}`);
        try {
            const messagesResponse = await axios.get<GetAgentCurrentConversationMessagesResponse>(
                `${DATABASE_SERVICE_URL}/messages/get-conversation-messages`, 
                { params: { conversation_id: conversationIdToUse } } // Use the determined ID
            );
            // Forward the successful response from the message service
            res.status(messagesResponse.status).json(messagesResponse.data);

        } catch (dbMsgError: any) {
            // Handle errors specifically from the message fetching call
            console.error(`[Agent Service /msg] DB Error fetching messages for conversation ${conversationIdToUse}:`, dbMsgError.message);
            const status = dbMsgError.response?.status || 500;
            const message = dbMsgError.response?.data?.error || 'Failed to get messages from DB';
            res.status(status).json({ success: false, error: message });
            // No need to call next(error) here as we are handling the response
        }
        // --- End Fetch Messages --- 

    } catch (error) {
        // Catch any unexpected errors not caught by specific handlers above
        console.error('[Agent Service /msg] Unexpected error in handler:', error);
        next(error); // Pass to the main Express error handler
    }
});

export default router; 