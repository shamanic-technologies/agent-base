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
    BaseResponse
} from '@agent-base/types';
// Import the new service function
import { 
    getOrCreateConversationsFromAgentApiClient, 
    createConversationApiClient
} from '@agent-base/api-client';

const router = Router();
// const DATABASE_SERVICE_URL = process.env.DATABASE_SERVICE_URL || 'http://localhost:3006'; // Unused

/**
 * Get conversations for an agent, or create one if none exist
 * GET /get-or-create-conversations-from-agent?agent_id=...
 */
router.get('/get-or-create-conversations-from-agent', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const agentId = req.query.agent_id as string;
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
            const conversationsResponse = await getOrCreateConversationsFromAgentApiClient(
                { agentId: agentId }, // Params object
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
        const { agentId, channelId, conversationId } = req.body;
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
            // Create the input object using the CreateConversationInput type
            const input: CreateConversationInput = {
                agentId,
                channelId,
                conversationId
            };
            
            // Call the correct API client function with the input object and auth details
            const response = await createConversationApiClient(
                input, 
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

export default router; 