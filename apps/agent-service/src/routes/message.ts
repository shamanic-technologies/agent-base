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
import { getOrCreateAgentConversation } from '../services/conversationService.js';

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
        // If no specific conversation_id was provided via query param, get or create it
        if (!conversationIdToUse && agentId) {
            console.log(`[Agent Service /msg] No conversation_id in query, using getOrCreateAgentConversation for agent ${agentId}`);
            try {
                // Call the internal service function 
                const conversation = await getOrCreateAgentConversation(agentId);
                conversationIdToUse = conversation.conversation_id;
                
                if (!conversationIdToUse) {
                    // This should technically not happen if getOrCreateAgentConversation works
                    throw new Error('getOrCreateAgentConversation succeeded but did not return a conversation_id');
                }
                console.log(`[Agent Service /msg] Determined conversation ID via service: ${conversationIdToUse}`);

            } catch (convError: any) {
                // Handle errors specifically from the get-or-create service call
                console.error(`[Agent Service /msg] Error during getOrCreateAgentConversation for agent ${agentId}:`, convError.message);
                // Use a generic 500 error status here, as the service function should handle specifics
                res.status(500).json({ success: false, error: convError.message || 'Failed to get or create conversation info' });
                return; // Stop execution if we can't get/create the conversation ID
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
            // Call the DB service directly to get messages (this could also be moved to a service)
            const messagesResponse = await axios.get<GetAgentCurrentConversationMessagesResponse>(
                `${DATABASE_SERVICE_URL}/messages/get-conversation-messages`,
                { params: { conversation_id: conversationIdToUse } }
            );
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