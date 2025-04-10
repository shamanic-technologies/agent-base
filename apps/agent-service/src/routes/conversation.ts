/**
 * Conversation routes within Agent Service
 * 
 * Proxies requests related to conversations to the database service.
 */
import { Router, Request, Response, NextFunction } from 'express';
import {
    // Import necessary types
    GetConversationsResponse,
    ConversationRecord,
    CreateConversationResponse,
    CreateConversationInput,
    BaseResponse
} from '@agent-base/agents';
// Import the new service function
import { getOrCreateConversationsFromAgent, createConversation } from '../services/index.js'; // Updated import

const router = Router();
const DATABASE_SERVICE_URL = process.env.DATABASE_SERVICE_URL || 'http://localhost:3006'; // This is now unused here

/**
 * Get conversations for an agent, or create one if none exist
 * GET /get-or-create-conversations-from-agent?agent_id=...
 */
router.get('/get-or-create-conversations-from-agent', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const agentId = req.query.agent_id as string;
        const userId = (req as any).user?.id as string;

        // Validate user authentication
        if (!userId) {
            res.status(401).json({ success: false, error: 'User authentication required' });
            return;
        }

        // Validate agent_id parameter
        if (!agentId) {
            res.status(400).json({ success: false, error: 'agent_id query parameter is required' });
            return;
        }

        // Call the database service wrapper function
        try {
            // Call the new function from database.ts
            const conversationsResponse = await getOrCreateConversationsFromAgent(agentId, userId);
            console.log('[Agent Service] Conversations response:', JSON.stringify(conversationsResponse, null, 2));
            // Forward the successful response from the database service
            // Note: The service function already returns the structured response
            res.status(200).json(conversationsResponse);

        } catch (error) {
            // The service function now throws errors, catch them here
            console.error('[Agent Service] Error calling database service wrapper:', error);
            // Send a generic 500 error, the specific error is logged
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get or create conversations'
            });
            // No return needed here as the catch block ends the function execution
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
        const { agent_id, channel_id, conversation_id } = req.body;
        const userId = (req as any).user?.id as string;

        // Validate user authentication
        if (!userId) {
            res.status(401).json({ success: false, error: 'User authentication required' });
            return;
        }

        // Validate required parameters
        if (!agent_id) {
            res.status(400).json({ success: false, error: 'agent_id is required in request body' });
            return;
        }

        if (!channel_id) {
            res.status(400).json({ success: false, error: 'channel_id is required in request body' });
            return;
        }

        if (!conversation_id) {
            res.status(400).json({ success: false, error: 'conversation_id is required in request body' });
            return;
        }

        try {
            // Create the input object using the CreateConversationInput type
            const input: CreateConversationInput = {
                agent_id,
                channel_id,
                conversation_id
            };
            
            // Call the database service wrapper function with the input object
            const response = await createConversation(input, userId);
            
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