/**
 * Message routes within Agent Service
 * 
 * Handles retrieving messages, potentially based on agent context.
 */
import { Router, Request, Response, NextFunction } from 'express';
// @ts-ignore - Message not directly exported from 'ai' in this context
import { Message } from 'ai'; // Changed import to Message from 'ai'
import {
    // Import necessary types
    GetConversationResponse, // Needed for getConversationById
    GetConversationsResponse, // Needed for getOrCreateConversationsFromAgent
    ConversationRecord // Keep for type safety
} from '@agent-base/agents';
// Import the database service functions
import { 
    getConversationById, 
    getOrCreateConversationsFromAgent 
} from '../services/database.js';

const router = Router();
// DATABASE_SERVICE_URL is no longer needed here

/**
 * Get all messages for a specific conversation
 * GET /get-messages-from-conversation?conversation_id=...
 */
router.get('/get-messages-from-conversation', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = (req as any).user?.id as string;
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

        try {
            console.log(`[Agent Service /msg] Fetching conversation ${conversationId} to extract messages`);
            const conversationResponse = await getConversationById(conversationId, userId);

            if (!conversationResponse.success || !conversationResponse.data) {
                // If conversation not found or other DB error
                console.warn(`[Agent Service /msg] Conversation ${conversationId} not found or error fetching.`);
                res.status(404).json({ success: false, error: 'Conversation not found or access denied' });
                return;
            }
            
            // Extract and return messages
            const messages: Message[] = conversationResponse.data.messages || [];
            console.log(`[Agent Service /msg] Returning ${messages.length} messages for conversation ${conversationId}`);
            res.status(200).json({ success: true, data: messages }); // Return messages in a structured response
            
        } catch (dbError: any) {
            console.error(`[Agent Service /msg] Error fetching conversation ${conversationId}:`, dbError);
            res.status(500).json({ success: false, error: dbError.message || 'Failed to get conversation data' });
        }
        
    } catch (error) {
        console.error('[Agent Service /msg] Unexpected error in get-messages-from-conversation handler:', error);
        next(error);
    }
});

/**
 * Get all messages for a specific agent across all their conversations
 * GET /get-messages-from-agent?agent_id=...
 */
router.get('/get-messages-from-agent', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = (req as any).user?.id as string;
        const agentId = req.query.agent_id as string;

        // --- Validation ---
        if (!userId) {
            res.status(401).json({ success: false, error: 'User authentication required' });
            return;
        }
        if (!agentId) {
            res.status(400).json({ success: false, error: 'agent_id query parameter is required' });
            return;
        }
        // --- End Validation ---

        try {
            console.log(`[Agent Service /msg] Fetching conversations for agent ${agentId} to extract messages`);
            const conversationsResponse = await getOrCreateConversationsFromAgent(agentId, userId);

            if (!conversationsResponse.success || !conversationsResponse.data) {
                 console.warn(`[Agent Service /msg] No conversations found or error fetching for agent ${agentId}.`);
                 // Return empty list if no conversations found or error occurs
                 res.status(200).json({ success: true, data: [] }); 
                 return;
            }

            // Combine messages from all conversations
            let allMessages: Message[] = [];
            conversationsResponse.data.forEach(conv => {
                if (conv.messages && Array.isArray(conv.messages)) {
                    allMessages = allMessages.concat(conv.messages);
                }
            });
            
            // Optional: Sort combined messages by timestamp if needed (requires message structure to have timestamp)
            // allMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

            console.log(`[Agent Service /msg] Returning ${allMessages.length} total messages for agent ${agentId}`);
            res.status(200).json({ success: true, data: allMessages }); // Return combined messages
            
        } catch (dbError: any) {
            console.error(`[Agent Service /msg] Error fetching conversations for agent ${agentId}:`, dbError);
            res.status(500).json({ success: false, error: dbError.message || 'Failed to get conversations data' });
        }
        
    } catch (error) {
        console.error('[Agent Service /msg] Unexpected error in get-messages-from-agent handler:', error);
        next(error);
    }
});

export default router; 