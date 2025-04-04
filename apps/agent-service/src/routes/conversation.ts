/**
 * Conversation routes within Agent Service
 * 
 * Proxies requests related to conversations to the database service.
 */
import { Router, Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { randomUUID } from 'crypto'; // Import randomUUID
import {
    // Import necessary types
    GetAgentCurrentConversationResponse,
    CreateConversationInput,
    CreateConversationResponse,
    GetConversationsResponse
} from '@agent-base/agents';
// Import the new service function
import { getOrCreateCurrentConversationFromAgent } from '../services/conversationService.js';

const router = Router();
const DATABASE_SERVICE_URL = process.env.DATABASE_SERVICE_URL || 'http://localhost:3006';

/**
 * Get the current conversation for a specific agent, creating one if it doesn't exist.
 * GET /get-or-create-current-conversation?agent_id=...
 */
router.get('/get-or-create-current-conversation', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const agentId = req.query.agent_id as string;
        const userId = (req as any).user?.id as string; // Still useful for auth checks if needed

        if (!userId) {
            res.status(401).json({ success: false, error: 'User authentication required' });
            return;
        }

        if (!agentId) {
            res.status(400).json({ success: false, error: 'agent_id query parameter is required' });
            return;
        }

        console.log(`[Agent Service /conv Route] Handling get-or-create for agent ${agentId}`);

        // Call the service function
        const conversationData = await getOrCreateCurrentConversationFromAgent(agentId);

        // Return the conversation data with appropriate status (200 OK is fine here)
        res.status(200).json({
            success: true,
            data: conversationData
        } as GetAgentCurrentConversationResponse); // Cast to the expected response type

    } catch (error: any) {
        // Handle errors thrown by the service function
        console.error(`[Agent Service /conv Route] Error in get-or-create for agent ${req.query.agent_id}:`, error.message);
         // Determine appropriate status code based on the error, if possible
         // For now, defaulting to 500, but could inspect error message/type for 4xx codes
        if (!res.headersSent) {
            res.status(500).json({ 
                success: false, 
                error: error.message || 'Failed to get or create conversation'
            });
        }
        // Optionally call next(error) if you have a generic error handler middleware
        // next(error); 
    }
});

/**
 * NEW: Create a new conversation endpoint.
 * Generates conversation_id if not provided.
 * Defaults channel_id to 'web' if not provided.
 */
router.post('/create-conversation', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Extract data from request body
        const { agent_id, conversation_id: provided_conversation_id, channel_id: provided_channel_id } = req.body;
        // Extract user ID from auth middleware (although not directly used by DB service endpoint)
        const userId = (req as any).user?.id as string;

        // Validate user ID (authentication check)
        if (!userId) {
            res.status(401).json({ success: false, error: 'User authentication required' });
            return;
        }

        // Validate mandatory agent_id
        if (!agent_id) {
            res.status(400).json({ success: false, error: 'agent_id is required in the request body' });
            return;
        }

        // Generate conversation_id if not provided
        const conversation_id = provided_conversation_id || randomUUID();
        // Default channel_id if not provided
        const channel_id = provided_channel_id || 'web';

        // Prepare input for the database service
        const dbInput: CreateConversationInput = {
            conversation_id,
            agent_id,
            channel_id
        };

        console.log(`[Agent Service /create-conversation] Calling DB service /conversations/create-conversation with input:`, dbInput);

        // Call the database service endpoint
        const response = await axios.post<CreateConversationResponse>(
            `${DATABASE_SERVICE_URL}/conversations/create-conversation`,
            dbInput
        );

        // Forward the response from the database service
        res.status(response.status).json(response.data);

    } catch (error) {
        console.error('[Agent Service] Error creating conversation:', error);
        // Handle potential Axios errors more gracefully
        if (axios.isAxiosError(error) && error.response) {
            res.status(error.response.status).json({ 
                success: false, 
                error: `Database service error: ${error.response.data?.error || error.message}`
            });
        } else {
            // Pass other errors to the default Express error handler
            next(error); 
        }
    }
});

/**
 * List all conversations for a specific agent
 * GET /list-conversations?agent_id=...
 */
router.get('/list-conversations', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const agentId = req.query.agent_id as string;
        const userId = (req as any).user?.id as string; // For auth checks if needed

        // Validate user authentication if required
        if (!userId) {
            res.status(401).json({ success: false, error: 'User authentication required' });
            return;
        }

        // Validate agent_id parameter
        if (!agentId) {
            res.status(400).json({ success: false, error: 'agent_id query parameter is required' });
            return;
        }

        console.log(`[Agent Service] Listing conversations for agent ${agentId}`);

        // Call the database service endpoint
        const response = await axios.get<GetConversationsResponse>(
            `${DATABASE_SERVICE_URL}/conversations/get-conversations`,
            { params: { agent_id: agentId } }
        );

        // Forward the response from the database service
        res.status(response.status).json(response.data);

    } catch (error) {
        console.error('[Agent Service] Error listing conversations:', error);
        
        // Handle Axios errors more gracefully
        if (axios.isAxiosError(error) && error.response) {
            res.status(error.response.status).json({ 
                success: false, 
                error: `Database service error: ${error.response.data?.error || error.message}`
            });
        } else {
            // For non-Axios errors
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error fetching conversations'
                });
            }
        }
    }
});

export default router; 