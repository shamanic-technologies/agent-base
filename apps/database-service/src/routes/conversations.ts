/**
 * Conversations Routes
 * 
 * API endpoints for managing conversations
 */
import express, { RequestHandler, Request, Response, NextFunction } from 'express';
import { 
    CreateConversationInput, 
    CreateConversationResponse,
    GetConversationsInput,
    GetConversationsResponse,
    GetAgentCurrentConversationInput,
    GetAgentCurrentConversationResponse
} from '@agent-base/agents';
import { createConversation, getConversationsByAgent, getAgentCurrentConversation } from '../services/conversations.js';

const router = express.Router();

/**
 * Create a new conversation
 * POST /create-conversation
 */
router.post('/create-conversation', (async (req: Request, res: Response) => {
  try {
    const input: CreateConversationInput = req.body;

    // Basic validation (already handled in service, but good practice here too)
    if (!input.conversation_id || !input.agent_id || !input.channel_id) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: conversation_id, agent_id, channel_id'
      } as CreateConversationResponse);
      return;
    }

    console.log(`[DB Route /conversations] Received request to create conversation ${input.conversation_id}`);
    const result = await createConversation(input);
    
    if (!result.success) {
        // Service handles conflict as success, so this is likely a DB error
        console.error(`[DB Route /conversations] Service failed to create conversation:`, result.error);
        res.status(500).json(result as CreateConversationResponse);
        return;
    }

    // Return 201 if created, 200 if already existed (service returns success:true in both cases)
    // We don't easily know which happened here without more info from service,
    // so let's return 200 OK consistently for idempotency.
    console.log(`[DB Route /conversations] Conversation creation/check successful for ID: ${result.data?.conversation_id}`);
    res.status(200).json(result as CreateConversationResponse);

  } catch (error) {
    console.error('Error in POST /conversations/create-conversation route:', error);
    if (!res.headersSent) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown internal server error'
        } as CreateConversationResponse);
    }
  }
}) as RequestHandler);

/**
 * Get all conversations for an agent
 * GET /get-conversations?agent_id=...
 */
router.get('/get-conversations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract agent_id from query parameters
    const agent_id = req.query.agent_id as string;

    // Validate agent_id
    if (!agent_id) {
      res.status(400).json({ success: false, error: 'agent_id query parameter is required' } as GetConversationsResponse);
      return;
    }

    console.log(`[DB Route /conversations] Getting conversations for agent ${agent_id}`);
    const input: GetConversationsInput = { agent_id };
    const result = await getConversationsByAgent(input);
    
    // Handle service errors
    if (!result.success) {
       console.error(`[DB Route /conversations] Service error getting conversations:`, result.error);
       res.status(500).json(result as GetConversationsResponse); 
       return;
    }

    // Return 200 OK with the data (potentially empty array)
    console.log(`[DB Route /conversations] Retrieved ${result.data?.length ?? 0} conversations.`);
    res.status(200).json(result as GetConversationsResponse);

  } catch (error) {
    console.error('Error in GET /conversations/get-conversations route:', error);
    next(error); 
  }
});

/**
 * Get the current (latest updated) conversation for an agent
 * GET /get-agent-current-conversation?agent_id=...
 */
router.get('/get-agent-current-conversation', async (req: Request, res: Response, next: NextFunction) => {
  // LOG THE RAW QUERY OBJECT
  console.log(`[DB Route /conversations] RAW req.query:`, JSON.stringify(req.query)); 
  try {
    // Simple extraction - Assuming upstream service sends a valid string
    const agent_id = req.query.agent_id as string;

    // Basic validation
    if (!agent_id) {
      res.status(400).json({ success: false, error: 'agent_id query parameter is required' });
      return;
    }
    if (typeof agent_id !== 'string') {
       res.status(400).json({ success: false, error: 'agent_id query parameter must be a string' });
       return;
    }

    console.log(`[DB Route /conversations] Getting current conversation for agent ${agent_id}`);
    const input: GetAgentCurrentConversationInput = { agent_id }; 
    const result = await getAgentCurrentConversation(input);
    
    // Handle actual service errors
    if (!result.success) {
       console.error(`[DB Route /conversations] Service error getting current conversation:`, result.error);
       res.status(500).json(result as GetAgentCurrentConversationResponse);
       return;
    }

    // Return 200 OK with the service result (data can be null)
    console.log(`[DB Route /conversations] Retrieved current conversation status for agent ${agent_id}. Found: ${!!result.data}`);
    res.status(200).json(result as GetAgentCurrentConversationResponse);

  } catch (error) {
    console.error('Error in GET /conversations/get-agent-current-conversation route:', error);
    next(error); 
  }
});

// Add other conversation endpoints here later (GET, DELETE, etc.)

export default router; 