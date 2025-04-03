/**
 * Conversation routes within Agent Service
 * 
 * Proxies requests related to conversations to the database service.
 */
import { Router, Request, Response, NextFunction } from 'express';
import axios from 'axios';
import {
    // Import necessary types
    GetAgentCurrentConversationResponse
} from '@agent-base/agents';

const router = Router();
const DATABASE_SERVICE_URL = process.env.DATABASE_SERVICE_URL || 'http://localhost:3006';

/**
 * Get the current conversation for a specific agent.
 * GET /get-agent-current-conversation?agent_id=...
 */
router.get('/get-agent-current-conversation', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const agentId = req.query.agent_id as string;
        // Note: We might also want user_id from auth (req.user.id) for authorization 
        // even if the DB service doesn't strictly need it for this query.
        const userId = (req as any).user?.id as string;

        if (!userId) {
            return res.status(401).json({ success: false, error: 'User authentication required' });
        }

        if (!agentId) {
            return res.status(400).json({ success: false, error: 'agent_id query parameter is required' });
        }

        console.log(`[Agent Service /conv] Forwarding request to get current conversation for agent ${agentId}`);

        // Call database service endpoint
        const response = await axios.get<GetAgentCurrentConversationResponse>(
            `${DATABASE_SERVICE_URL}/conversations/get_agent_current_conversation`, {
                params: { agent_id: agentId }
                // Add headers if DB service requires auth, e.g., { headers: { 'x-user-id': userId } }
            }
        );

        res.status(response.status).json(response.data);

    } catch (error) {
        console.error('[Agent Service /conv] Error getting current conversation:', error);
        // Handle potential Axios errors
        if (axios.isAxiosError(error) && error.response) {
            return res.status(error.response.status).json({ 
                success: false, 
                error: `Database service error: ${error.response.data?.error || error.message}`
            });
        }    
        // Pass other errors to general error handler
        next(error);
    }
});

export default router; 