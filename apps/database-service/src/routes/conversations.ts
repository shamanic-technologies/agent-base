/**
 * Conversations Routes
 * 
 * API endpoints for managing conversations
 */
import express, { RequestHandler, Request, Response, NextFunction } from 'express';
import { UIMessage } from 'ai';
import {
    CreateConversationInput,
    CreateConversationResponse,
    GetConversationsResponse,
    ConversationRecord,
    GetConversationsFromAgentInput,
    BaseResponse,
} from '@agent-base/agents';
import {
    createConversation,
    getConversation,
    getConversationsByAgent,
    updateConversationMessages,
} from '../services/conversations.js';

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
 * GET /get-conversations-from-agent?agent_id=...
 */
router.get('/get-conversations-from-agent', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract agent_id from query parameters
    const agent_id = req.query.agent_id as string;

    // Validate agent_id
    if (!agent_id) {
      res.status(400).json({ success: false, error: 'agent_id query parameter is required' } as GetConversationsResponse);
      return;
    }

    console.log(`[DB Route /conversations] Getting conversations for agent ${agent_id}`);
    const input: GetConversationsFromAgentInput = { agent_id };
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
    console.error('Error in GET /conversations/get-conversations-from-agent route:', error);
    next(error); 
  }
});

/**
 * Update the messages array for a specific conversation
 * POST /update-conversation
 * Body: { conversation_id: string, messages: UIMessage[] }
 */
router.post('/update-conversation', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { conversation_id, messages } = req.body;

    // --- Validation ---
    if (!conversation_id) {
      return res.status(400).json({ success: false, error: 'conversation_id is required' } as BaseResponse);
    }
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ success: false, error: 'messages is required and must be an array' } as BaseResponse);
    }
    // TODO: Add more robust validation for UIMessage structure if needed
    // --- End Validation ---

    console.log(`[DB Route /conversations] Updating messages for conversation ${conversation_id}`);
    const result = await updateConversationMessages(conversation_id, messages);

    if (!result.success) {
      // Service function returns success:false if conversation not found or DB error
      // Determine status code based on error message (heuristic)
      const statusCode = result.error?.toLowerCase().includes('not found') ? 404 : 500;
      console.error(`[DB Route /conversations] Service error updating messages for ${conversation_id}:`, result.error);
      return res.status(statusCode).json(result as BaseResponse);
    }

    // Return 200 OK on successful update
    console.log(`[DB Route /conversations] Successfully updated messages for ${conversation_id}`);
    return res.status(200).json(result as BaseResponse);

  } catch (error) {
    console.error('Error in POST /conversations/update-conversation route:', error);
    next(error); // Pass to default error handler
  }
});


export default router; 