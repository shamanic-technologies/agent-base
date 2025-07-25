/**
 * LangGraph Conversation routes within Agent Service
 * 
 * Proxies requests related to LangGraph conversations to the database service.
 */
import { Router, Request, Response, NextFunction } from 'express';
import {
    CreateConversationInput,
    Conversation,
    ServiceResponse,
} from '@agent-base/types';
import { 
    getOrCreateConversationsLangGraphInternalApiService, 
    createConversationLangGraphInternalApiService,
    getConversationByIdLangGraphInternalApiService,
    getAllUserConversationsFromDbServiceLangGraph,
    getAllPlatformUserConversationsFromDbServiceLangGraph
} from '@agent-base/api-client';

const router = Router();

/**
 * Get LangGraph conversations for an agent, or create one if none exist
 */
router.get('/get-or-create-conversations-from-agent-langgraph', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const agentId = req.query.agentId as string;
        const clientUserId = req.clientUserId as string;
        const clientOrganizationId = req.clientOrganizationId as string;
        const platformUserId = req.platformUserId as string;
        const platformApiKey = req.headers['x-platform-api-key'] as string;

        if (!clientUserId || !clientOrganizationId || !platformUserId || !platformApiKey) {
            res.status(401).json({ success: false, error: 'Authentication details missing from request headers/context' });
            return;
        }

        if (!agentId) {
            res.status(400).json({ success: false, error: 'agentId query parameter is required' });
            return;
        }

        try {
            const conversationsResponse = await getOrCreateConversationsLangGraphInternalApiService(
                { agentId },
                clientUserId,
                clientOrganizationId,
                platformUserId,
                platformApiKey
            );
            res.status(200).json(conversationsResponse);

        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get or create conversations'
            });
        }

    } catch (error) {
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error processing conversations'
            });
        }
    }
});

/**
 * Create a new LangGraph conversation
 */
router.post('/create-conversation-langgraph', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { agentId, channelId, conversationId }: CreateConversationInput = req.body;
        const clientUserId = req.clientUserId as string;
        const clientOrganizationId = req.clientOrganizationId as string;
        const platformUserId = req.platformUserId as string;
        const platformApiKey = req.headers['x-platform-api-key'] as string;

        if (!clientUserId || !clientOrganizationId || !platformUserId || !platformApiKey) {
            res.status(401).json({ success: false, error: 'Authentication details missing from request headers/context' });
            return;
        }

        if (!agentId || !channelId || !conversationId) {
            res.status(400).json({ success: false, error: 'agentId, channelId, and conversationId are required in request body' });
            return;
        }

        try {
            const response = await createConversationLangGraphInternalApiService(
                req.body, 
                clientUserId, 
                clientOrganizationId,
                platformUserId, 
                platformApiKey
            );
            res.status(response.success ? 201 : 500).json(response);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create conversation'
            });
        }
    } catch (error) {
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error creating conversation'
            });
        }
    }
});

/**
 * Get a LangGraph conversation by ID, or create it if it doesn't exist.
 */
router.post('/get-or-create-conversation-langgraph', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { agentId, channelId, conversationId }: CreateConversationInput = req.body;
        const clientUserId = req.clientUserId as string;
        const clientOrganizationId = req.clientOrganizationId as string;
        const platformUserId = req.platformUserId as string;
        const platformApiKey = req.headers['x-platform-api-key'] as string;

        if (!clientUserId || !clientOrganizationId || !platformUserId || !platformApiKey) {
            res.status(401).json({ success: false, error: 'Authentication details missing from request headers/context' });
            return;
        }

        if (!agentId || !channelId || !conversationId) {
            res.status(400).json({ success: false, error: 'agentId, channelId, and conversationId are required in request body' });
            return;
        }

        const getResponse : ServiceResponse<Conversation> = await getConversationByIdLangGraphInternalApiService(
            { conversationId },
            clientUserId,
            clientOrganizationId,
            platformUserId,
            platformApiKey
        );

        if (getResponse.success && getResponse.data) {
            res.status(200).json(getResponse);
            return;
        }
        
        const createResponse: ServiceResponse<Conversation> =
          await createConversationLangGraphInternalApiService(
            req.body,
            clientUserId,
            clientOrganizationId,
            platformUserId,
            platformApiKey
          );
        
        if (!createResponse.success) {
            res.status(500).json(createResponse);
            return;
        }

        res.status(201).json(createResponse);

    } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error processing get-or-create conversation'
        });
      }
});

/**
 * Get all LangGraph conversations for the authenticated user across all their agents.
 */
router.get('/get-all-user-conversations-langgraph', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const clientUserId = req.clientUserId as string;
    const clientOrganizationId = req.clientOrganizationId as string;
    const platformUserId = req.platformUserId as string;
    const platformApiKey = req.headers['x-platform-api-key'] as string;

    if (!clientUserId || !clientOrganizationId || !platformUserId || !platformApiKey) {
        res.status(401).json({ success: false, error: 'Authentication details missing' });
        return;
    }

    try {
        const response = await getAllUserConversationsFromDbServiceLangGraph(
            { clientUserId },
            clientUserId,
            clientOrganizationId,
            platformUserId,
            platformApiKey
        );

        if (response.success) {
            res.status(200).json(response);
        } else {
            res.status(500).json(response);
        }
    } catch (error) {
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
});

/**
 * Get all LangGraph conversations for the authenticated platform user.
 */
router.get('/get-all-platform-user-conversations-langgraph', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const clientUserId = req.clientUserId as string;
    const clientOrganizationId = req.clientOrganizationId as string;
    const platformUserId = req.platformUserId as string;
    const platformApiKey = req.headers['x-platform-api-key'] as string;

    if (!clientUserId || !clientOrganizationId || !platformUserId || !platformApiKey) {
        res.status(401).json({ success: false, error: 'Authentication details missing' });
        return;
    }

    try {
        const response = await getAllPlatformUserConversationsFromDbServiceLangGraph(
            { platformUserId },
            clientUserId,
            clientOrganizationId,
            platformUserId,
            platformApiKey
        );

        if (response.success) {
            res.status(200).json(response);
        } else {
            res.status(500).json(response);
        }
    } catch (error) {
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
});

export default router; 