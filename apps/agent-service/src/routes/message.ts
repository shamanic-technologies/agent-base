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
    // GetConversationResponse, // Needed for getConversationById
    // GetConversationsResponse, // Needed for getOrCreateConversationsFromAgent
    // ConversationRecord // Keep for type safety
} from '@agent-base/types';
// Import the database service functions
import { 
    getConversationByIdInternalApiService,
    getOrCreateConversationsInternalApiService
} from '@agent-base/api-client';

const router = Router();
// DATABASE_SERVICE_URL is no longer needed here

/**
 * Get all messages for a specific conversation
 * GET /get-messages-from-conversation?conversationId=...
 */
router.get('/get-messages-from-conversation', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const conversationId = req.query.conversationId as string;
    const clientUserId = req.clientUserId as string;
    const platformUserId = req.platformUserId as string;
    const platformApiKey = req.headers['x-platform-api-key'] as string;

    if (!conversationId) {
        res.status(400).json({ success: false, error: 'conversationId query parameter is required' });
        return;
    }
    if (!clientUserId || !platformUserId || !platformApiKey) {
        res.status(401).json({ success: false, error: 'Authentication details missing' });
        return;
    }

    const logPrefix = `[Agent Service /msg/get-from-conv] User ${clientUserId}, Conv ${conversationId}:`;

    try {
        const conversationResponse = await getConversationByIdInternalApiService(
            { conversationId },
            platformUserId,
            platformApiKey,
            clientUserId
        );

        if (conversationResponse.success && conversationResponse.data) {
            // Access messages directly from conversationResponse.data (assuming it's ConversationRecord)
            const messages: Message[] = conversationResponse.data.messages || []; 
            res.status(200).json({ success: true, data: messages });
        } else {
            console.error(`${logPrefix} Failed to get conversation from service:`, conversationResponse.error);
            const statusCode = conversationResponse.error?.toLowerCase().includes('not found') ? 404 : 500;
            res.status(statusCode).json({ success: false, error: conversationResponse.error || 'Failed to retrieve conversation' });
        }

    } catch (error) {
        console.error(`${logPrefix} Unexpected error:`, error);
        next(error);
    }
});

/**
 * Get all messages for a specific agent across all their conversations
 * GET /get-messages-from-agent?agent_id=...
 */
router.get('/get-messages-from-agent', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const agentId = req.query.agentId as string;
    const clientUserId = req.clientUserId as string;
    const platformUserId = req.platformUserId as string;
    const platformApiKey = req.headers['x-platform-api-key'] as string;

    if (!agentId) {
        res.status(400).json({ success: false, error: 'agentId query parameter is required' });
        return;
    }
    if (!clientUserId || !platformUserId || !platformApiKey) {
        res.status(401).json({ success: false, error: 'Authentication details missing' });
        return;
    }

    const logPrefix = `[Agent Service /msg/get-from-agent] User ${clientUserId}, Agent ${agentId}:`;

    try {
        const conversationsResponse = await getOrCreateConversationsInternalApiService(
            { agentId: agentId },
            clientUserId,
            platformUserId,
            platformApiKey
        );

        if (conversationsResponse.success && conversationsResponse.data) {
            let allMessages: Message[] = [];
            // Iterate directly over conversationsResponse.data which is ConversationRecord[]
            conversationsResponse.data.forEach(conv => { 
                if (conv.messages && Array.isArray(conv.messages)) {
                    allMessages = allMessages.concat(conv.messages);
                }
            });
            // Sort messages by creation date ascending (optional, but good practice)
            allMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            
            res.status(200).json({ success: true, data: allMessages });
        } else {
            console.error(`${logPrefix} Failed to get conversations from service:`, conversationsResponse.error);
            res.status(500).json({ success: false, error: conversationsResponse.error || 'Failed to retrieve conversations' });
        }

    } catch (error) {
        console.error(`${logPrefix} Unexpected error:`, error);
        next(error);
    }
});

export default router; 