/**
 * Conversation routes within Agent Service
 * 
 * Proxies requests related to conversations to the database service.
 */
import { Router, Request, Response, NextFunction } from 'express';
import {
    // Import necessary types
    // GetConversationsResponse,
    // ConversationRecord,
    // CreateConversationResponse,
    CreateConversationInput,
    Conversation,
    ServiceResponse,
    ConversationId,
    BaseResponse
} from '@agent-base/types';
// Import the new service function
import { 
    getOrCreateConversationsInternalApiService, 
    createConversationInternalApiService,
    getConversationByIdInternalApiService,
    // Import the new API client function
    getAllUserConversationsFromDbService 
} from '@agent-base/api-client';

const router = Router();
// const DATABASE_SERVICE_URL = process.env.DATABASE_SERVICE_URL || 'http://localhost:3006'; // Unused

/**
 * Get conversations for an agent, or create one if none exist
 * GET /get-or-create-conversations-from-agent?agent_id=...
 */
router.get('/get-or-create-conversations-from-agent', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const agentId = req.query.agentId as string;
        // Extract auth details from augmented request
        const clientUserId = req.clientUserId as string;
        const platformUserId = req.platformUserId as string;
        const platformApiKey = req.headers['x-platform-api-key'] as string;

        // Validate auth details first
        if (!clientUserId || !platformUserId || !platformApiKey) {
            res.status(401).json({ success: false, error: 'Authentication details missing from request headers/context' });
            return;
        }

        // Validate agent_id parameter
        if (!agentId) {
            res.status(400).json({ success: false, error: 'agentId query parameter is required' });
            return;
        }

        // Call the database service wrapper function
        try {
            // Call the correct API client function with required params and auth details
            const conversationsResponse = await getOrCreateConversationsInternalApiService(
                { agentId }, // Params object
                clientUserId,
                platformUserId,
                platformApiKey
            );
            console.log('[Agent Service] Conversations response:', JSON.stringify(conversationsResponse, null, 2));
            // Forward the successful response from the database service
            res.status(200).json(conversationsResponse);

        } catch (error) {
            // The service function now throws errors, catch them here
            console.error('[Agent Service] Error calling database service wrapper:', error);
            // Send a generic 500 error, the specific error is logged
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get or create conversations'
            });
        }

    } catch (error) {
        console.error('[Agent Service] Unexpected error in get-or-create-conversations-from-agent:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error processing conversations'
            });
        }
    }
});

/**
 * Create a new conversation
 * POST /create-conversation
 * 
 * Creates a new conversation linked to a specific agent and channel
 */
router.post('/create-conversation', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { agentId, channelId, conversationId }: CreateConversationInput = req.body;
        // Extract auth details from augmented request
        const clientUserId = req.clientUserId as string;
        const platformUserId = req.platformUserId as string;
        const platformApiKey = req.headers['x-platform-api-key'] as string;

        // Validate auth details first
        if (!clientUserId || !platformUserId || !platformApiKey) {
            res.status(401).json({ success: false, error: 'Authentication details missing from request headers/context' });
            return;
        }

        // Validate required parameters
        if (!agentId) {
            res.status(400).json({ success: false, error: 'agentId is required in request body' });
            return;
        }

        if (!channelId) {
            res.status(400).json({ success: false, error: 'channelId is required in request body' });
            return;
        }

        if (!conversationId) {
            res.status(400).json({ success: false, error: 'conversationId is required in request body' });
            return;
        }

        try {

            // Call the correct API client function with the input object and auth details
            const response = await createConversationInternalApiService(
                req.body, 
                clientUserId, 
                platformUserId, 
                platformApiKey
            );
            
            // Forward the response from the database service
            res.status(response.success ? 201 : 500).json(response);
        } catch (error) {
            console.error('[Agent Service] Error calling database service:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create conversation'
            });
        }
    } catch (error) {
        console.error('[Agent Service] Unexpected error in create-conversation:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error creating conversation'
            });
        }
    }
});

/**
 * Get a conversation by ID, or create it if it doesn't exist.
 * POST /get-or-create-conversation
 */
router.post('/get-or-create-conversation', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { agentId, channelId, conversationId }: CreateConversationInput = req.body;
        const clientUserId = req.clientUserId as string;
        const platformUserId = req.platformUserId as string;
        const platformApiKey = req.headers['x-platform-api-key'] as string;

        // Validate auth details first
        if (!clientUserId || !platformUserId || !platformApiKey) {
            console.log(`[Agent Service] Authentication details missing from request headers/context`);
            res.status(401).json({ success: false, error: 'Authentication details missing from request headers/context' });
            return;
        }

        // Validate required parameters
        if (!agentId) {
            console.log(`[Agent Service] Attempting to get conversation ${conversationId}`);
            res.status(400).json({ success: false, error: 'agentId is required in request body' });
            return;
        }
        if (!channelId) {
            console.log(`[Agent Service] Attempting to get conversation ${conversationId}`);
            res.status(400).json({ success: false, error: 'channelId is required in request body' });
            return;
        }
        if (!conversationId) {
            console.log(`[Agent Service] Attempting to get conversation ${conversationId}`);
            res.status(400).json({ success: false, error: 'conversationId is required in request body' });
            return;
        }

        // 1. Try to get the conversation by ID
        const getResponse : ServiceResponse<Conversation> = await getConversationByIdInternalApiService(
            { conversationId },
            clientUserId,
            platformUserId,
            platformApiKey
        );

        if (!getResponse.success) {
            console.log(`[Agent Service] Conversation ${conversationId} not found.`);
            res.status(404).json(getResponse);
            return;
        }
        if (!!getResponse.data) {
            // If data is found, return the found conversation
            res.status(200).json(getResponse);
            return;
        }
        // 2. If get failed (assumed not found), try to create it
        const createResponse = await createConversationInternalApiService(
            req.body, // Contains agentId, channelId, conversationId
            clientUserId,
            platformUserId,
            platformApiKey
        );
        if (!createResponse.success) {
            console.log(`[Agent Service] Failed to create conversation ${conversationId}: ${createResponse.error}`);
            res.status(500).json(createResponse);
            return;
        }

        // If creation is successful, return the new conversation (status 201 Created)
        res.status(201).json(createResponse);

    } catch (error) {
        console.error('[Agent Service] Unexpected error in get-or-create-conversation:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error processing get-or-create conversation'
        });
    }
});

/**
 * Get all conversations for the authenticated user across all their agents.
 * GET /get-all-user-conversations
 */
router.get('/get-all-user-conversations', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const clientUserId = req.clientUserId as string;
    const platformUserId = req.platformUserId as string;
    const platformApiKey = req.headers['x-platform-api-key'] as string;

    const logPrefix = `[Agent Service /get-all-user-conversations] User ${clientUserId}:`;

    // Validate auth details first
    if (!clientUserId || !platformUserId || !platformApiKey) {
        console.error(`${logPrefix} Authentication details missing.`);
        res.status(401).json({ success: false, error: 'Authentication details missing from request headers/context' });
        return;
    }

    try {
        console.log(`${logPrefix} Calling getAllUserConversationsFromDbService.`);
        // Call the API client function. 
        // The clientUserId for auth is the same as the one we're fetching data for.
        const response = await getAllUserConversationsFromDbService(
            { clientUserId }, // Params object with clientUserId to fetch data for
            clientUserId,                 // clientUserId for authentication context
            platformUserId,
            platformApiKey
        );

        if (response.success) {
            console.log(`${logPrefix} Successfully retrieved ${response.data?.length ?? 0} conversations.`);
            res.status(200).json(response);
        } else {
            console.error(`${logPrefix} Failed to retrieve conversations: ${response.error}`);
            // Determine status code based on error if possible, otherwise default to 500
            // For now, just forwarding the error and assuming the client function handled status appropriately if it was a direct HTTP error.
            // If the error is from the DB service, it might be a generic 500 from its perspective.
            res.status(500).json({ success: false, error: response.error || 'Failed to retrieve all user conversations' });
        }
    } catch (error) {
        console.error(`${logPrefix} Unexpected error:`, error);
        // Pass to generic error handler or ensure response is sent
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error processing get-all-user-conversations'
            });
        }
        // next(error); // Uncomment if you have a global error handler that sends response
    }
});

export default router; 