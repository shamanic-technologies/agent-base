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
import { getOrCreateCurrentConversationFromAgent } from '../services/conversationService.js';

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

        // --- Validation --- 
        if (!userId) {
            res.status(401).json({ success: false, error: 'User authentication required' });
            return;
        }
        // Need agent_id (to find the current conversation)
        if (!agentId) {
            res.status(400).json({ success: false, error: 'agent_id query parameter is required' });
            return;
        }
        // --- End Validation --- 

        let currentConversationId: string;
        // --- Determine Conversation ID --- 
        // If no specific conversation_id was provided via query param, get or create it
        if (agentId) {
            console.log(`[Agent Service /msg] No conversation_id in query, using getOrCreateAgentConversation for agent ${agentId}`);
            try {
                // Call the internal service function 
                const conversation = await getOrCreateCurrentConversationFromAgent(agentId, userId);
                currentConversationId = conversation.conversation_id;
                
                if (!currentConversationId) {
                    // This should technically not happen if getOrCreateAgentConversation works
                    throw new Error('getOrCreateAgentConversation succeeded but did not return a conversation_id');
                }

            } catch (convError: any) {
                // Use a generic 500 error status here, as the service function should handle specifics
                res.status(500).json({ success: false, error: convError.message || 'Failed to get or create conversation info' });
                return; // Stop execution if we can't get/create the conversation ID
            }
        }
        // --- End Determine Conversation ID --- 

        // --- Fetch Messages for the Determined Conversation ID --- 
        try {
            // Call the DB service directly to get messages (this could also be moved to a service)
            const messagesResponse = await axios.get<GetMessagesResponse>(
                `${DATABASE_SERVICE_URL}/messages/get-conversation-messages`,
                { params: { conversation_id: currentConversationId },
                  headers: {
                    'x-user-id': userId,
                  }
                }
            );
            res.status(messagesResponse.status).json(messagesResponse.data);

        } catch (dbMsgError: any) {
            // Handle errors specifically from the message fetching call
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

/**
 * List all messages for a specific conversation
 * GET /list-messages?conversation_id=...
 */
router.get('/list-messages', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Extract user ID from auth middleware
        const userId = (req as any).user?.id as string;
        // Extract conversation ID from query params
        const conversationId = req.query.conversation_id as string;

        // --- Validation ---
        if (!userId) {
            res.status(401).json({ success: false, error: 'User authentication required' });
            return;
        }
        
        if (!conversationId) {
            res.status(400).json({ success: false, error: 'conversation_id query parameter is required' });
            return;
        }
        // --- End Validation ---

        // --- Fetch Messages ---
        try {
            console.log(`[Agent Service /msg] Fetching messages for conversation ${conversationId}`);
            
            const messagesResponse = await axios.get<GetMessagesResponse>(
                `${DATABASE_SERVICE_URL}/messages/get-conversation-messages`,
                { 
                    params: { conversation_id: conversationId },
                    headers: {
                        'x-user-id': userId,
                    }
                }
            );
            
            res.status(messagesResponse.status).json(messagesResponse.data);
            
        } catch (dbMsgError: any) {
            const status = dbMsgError.response?.status || 500;
            const message = dbMsgError.response?.data?.error || 'Failed to get messages from DB';
            console.error(`[Agent Service /msg] Error fetching messages: ${message}`);
            res.status(status).json({ success: false, error: message });
        }
        // --- End Fetch Messages ---
        
    } catch (error) {
        console.error('[Agent Service /msg] Unexpected error in list-messages handler:', error);
        next(error);
    }
});

export default router; 