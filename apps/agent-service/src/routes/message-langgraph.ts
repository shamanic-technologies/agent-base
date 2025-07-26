/**
 * Message routes within Agent Service
 * 
 * Handles retrieving messages, potentially based on agent context.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { BaseMessage } from '@langchain/core/messages';
import { ConversationLanggraph, ServiceResponse } from '@agent-base/types';
// Import the database service functions
import { 
    getConversationByIdLangGraphInternalApiService,
    listConversationsByAgentLangGraphInternalApiService
} from '@agent-base/api-client';

const router = Router();

/**
 * Get all messages for a specific conversation
 * GET /get-messages-from-conversation?conversationId=...
 */
router.get('/get-messages-from-conversation', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const conversationId = req.query.conversationId as string;
    const clientUserId = req.clientUserId as string;
    const clientOrganizationId = req.clientOrganizationId as string;
    const platformUserId = req.platformUserId as string;
    const platformApiKey = req.headers['x-platform-api-key'] as string;

    if (!conversationId) {
        res.status(400).json({ success: false, error: 'conversationId query parameter is required' });
        return;
    }
    if (!clientUserId || !clientOrganizationId || !platformUserId || !platformApiKey) {
        res.status(401).json({ success: false, error: 'Authentication details missing' });
        return;
    }

    const logPrefix = `[Agent Service /msg/get-from-conv] User ${clientUserId}, Conv ${conversationId}:`;

    try {
        const conversationResponse: ServiceResponse<ConversationLanggraph> = await getConversationByIdLangGraphInternalApiService(
            { conversationId },
            clientUserId,
            clientOrganizationId,
            platformUserId,
            platformApiKey
        );
        if (!conversationResponse.success) {
            console.error(`${logPrefix} Failed to get conversation from service:`, conversationResponse.error);
            const statusCode = conversationResponse.error?.toLowerCase().includes('not found') ? 404 : 500;
            res.status(statusCode).json({ success: false, error: conversationResponse.error || 'Failed to retrieve conversation' });
            return;
        } 
        res.status(200).json(conversationResponse);

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
    const clientOrganizationId = req.clientOrganizationId as string;
    const platformUserId = req.platformUserId as string;
    const platformApiKey = req.headers['x-platform-api-key'] as string;

    if (!agentId) {
        res.status(400).json({ success: false, error: 'agentId query parameter is required' });
        return;
    }
    if (!clientUserId || !clientOrganizationId || !platformUserId || !platformApiKey) {
        res.status(401).json({ success: false, error: 'Authentication details missing' });
        return;
    }

    const logPrefix = `[Agent Service /msg/get-from-agent] User ${clientUserId}, Agent ${agentId}:`;

    try {
        const conversationsResponse = await listConversationsByAgentLangGraphInternalApiService(
            { agentId: agentId },
            clientUserId,
            clientOrganizationId,
            platformUserId,
            platformApiKey
        );

        if (!conversationsResponse.success) {
            console.error(`${logPrefix} Failed to get conversations from service:`, conversationsResponse.error);
            res.status(500).json(conversationsResponse);
            return;
        }

        let allMessages: BaseMessage[] = [];
        conversationsResponse.data.forEach((conv: ConversationLanggraph) => { 
            if (conv.messages && Array.isArray(conv.messages)) {
                allMessages = allMessages.concat(conv.messages);
            }
        });
        
        res.status(200).json({ success: true, data: allMessages });

    } catch (error) {
        console.error(`${logPrefix} Unexpected error:`, error);
        next(error);
    }
});

export default router; 