/**
 * Conversations Routes
 * 
 * API endpoints for managing conversations
 */
import express, { RequestHandler, Request, Response, NextFunction } from 'express';
import { Message } from 'ai';
import { randomUUID } from 'crypto';
import {  
    CreateConversationInput,
    ConversationRecord,
    AgentId,
    BaseResponse,
    UpdateConversationInput,
    ErrorResponse,
    SuccessResponse,
    ServiceResponse,
    ConversationId,
} from '@agent-base/types';
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
    const { conversationId, agentId, channelId }: CreateConversationInput = req.body;

    // Basic validation (already handled in service, but good practice here too)
    if (!conversationId || !agentId || !channelId) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: conversationId, agentId, channelId'
      } as ErrorResponse);
      return;
    }

    console.log(`[DB Route /conversations] Received request to create conversation ${conversationId}`);
    const createResponse = await createConversation(req.body);
    
    if (!createResponse.success) {
        // Service handles conflict as success, so this is likely a DB error
        console.error(`[DB Route /conversations] Service failed to create conversation:`, createResponse.error);
        res.status(500).json(createResponse);
        return;
    }

    // Return 201 if created, 200 if already existed (service returns success:true in both cases)
    // We don't easily know which happened here without more info from service,
    // so let's return 200 OK consistently for idempotency.
    console.log(`[DB Route /conversations] Conversation creation/check successful for ID: ${createResponse.data?.conversationId}`);
    res.status(200).json(createResponse);

  } catch (error) {
    console.error('Error in POST /conversations/create-conversation route:', error);
    if (!res.headersSent) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown internal server error'
        } as ErrorResponse);
    }
  }
}) as RequestHandler);

/**
 * Get all conversations for an agent
 * GET /get-conversations-from-agent?agent_id=...
 */
router.get('/get-conversations-from-agent', (async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract agent_id from query parameters
    const agentId = req.query.agentId as string;

    // Validate agent_id
    if (!agentId) {
      res.status(400).json({ success: false, error: 'agentId query parameter is required' } as ErrorResponse);
      return;
    }

    console.log(`[DB Route /conversations] Getting conversations for agent ${agentId}`);
    const input: AgentId = { agentId };
    const getResponse = await getConversationsByAgent(input);
    
    // Handle service errors
    if (!getResponse.success) {
       console.error(`[DB Route /conversations] Service error getting conversations:`, getResponse.error);
       res.status(500).json(getResponse); 
       return;
    }

    // Return 200 OK with the data (potentially empty array)
    console.log(`[DB Route /conversations] Retrieved ${getResponse.data?.length ?? 0} conversations.`);
    res.status(200).json(getResponse);
    return;

  } catch (error) {
    console.error('Error in GET /conversations/get-conversations-from-agent route:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown internal server error'
    } as ErrorResponse);
    next(error); 
  }
}) as unknown as RequestHandler);

/**
 * Get conversations for an agent, or create a default one if none exist.
 * GET /get-or-create-conversations-from-agent?agent_id=...
 */
router.get('/get-or-create-conversations-from-agent', (async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = req.query.agentId as string;

    if (!agentId) {
      return res.status(400).json({ success: false, error: 'agentId query parameter is required' } as ErrorResponse);
    }

    console.log(`[DB Route /conversations] Getting or creating conversation for agent ${agentId}`);
    const getInput: AgentId = { agentId };
    const getConversationsResponse = await getConversationsByAgent(getInput);

    // Handle errors during fetch
    if (!getConversationsResponse.success) {
      console.error(`[DB Route /conversations] Service error getting conversations for agent ${agentId}:`, getConversationsResponse.error);
      return res.status(500).json(getConversationsResponse);
    }

    // If conversations exist, return them
    if (getConversationsResponse.data && getConversationsResponse.data.length > 0) {
      console.log(`[DB Route /conversations] Found ${getConversationsResponse.data.length} existing conversations for agent ${agentId}.`);
      res.status(200).json(getConversationsResponse);
      return;
    }

    // If no conversations exist, create a new one
    console.log(`[DB Route /conversations] No conversations found for agent ${agentId}. Creating a new one.`);
    const newConversationId = randomUUID();
    const defaultChannelId = 'web'; 

    const createInput: CreateConversationInput = {
      conversationId: newConversationId,
      agentId: agentId,
      channelId: defaultChannelId
    };

    const createResponse : ServiceResponse<ConversationId> = await createConversation(createInput);

    // Handle errors during creation
    if (!createResponse.success) {
      console.error(`[DB Route /conversations] Failed to create conversation for agent ${agentId}:`, createResponse.error);
      return res.status(500).json(createResponse);
    }
    // Return the newly created conversation within the GetConversationsResponse structure
    res.status(201).json(createResponse);
    return;

  } catch (error) {
    console.error('Error in GET /get-or-create-conversations-from-agent route:', error);
    next(error); // Pass to default error handler
  }
}) as unknown as RequestHandler);

/**
 * Get a specific conversation by ID
 * GET /get-conversation/:conversation_id
 */
router.get('/get-conversation/:conversationId', (async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log(`[DB Route /conversations] Getting conversation ${JSON.stringify(req.params, null, 2)}`);
    const conversationId = req.params.conversationId;

    if (!conversationId) {
      // This case should ideally be caught by Express routing itself
      return res.status(400).json({ success: false, error: 'conversationId path parameter is required' });
    }

    console.log(`[DB Route /conversations] Getting single conversation ${conversationId}`);
    // Directly call the service function
    const getResponse = await getConversation(conversationId);

    if (!getResponse.success) {
      console.error(`[DB Route /conversations] Service error getting conversation ${conversationId}:`, getResponse.error);
      return res.status(500).json(getResponse);
    }

    // Success case
    res.status(200).json(getResponse);
    return;

  } catch (error) {
    console.error('Error in GET /conversations/get-conversation/:conversationId route:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown internal server error'
    } as ErrorResponse);
    next(error); // Pass to default error handler
  }
}) as unknown as RequestHandler);

/**
 * Update the messages array for a specific conversation
 * POST /update-conversation
 * Body: { conversation_id: string, messages: Message[] }
 */
router.post('/update-conversation', (async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input: UpdateConversationInput = req.body;
    const { conversationId, messages } = input; // Destructure after validation

    // --- Validation ---
    // Basic validation (can be enhanced, e.g., with Zod)
    if (!conversationId) {
      return res.status(400).json({ success: false, error: 'conversation_id is required' } as ErrorResponse);
    }
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ success: false, error: 'messages is required and must be an array' } as BaseResponse);
    }
    // --- End Validation ---

    console.log(`[DB Route /conversations] Updating messages for conversation ${conversationId}`);
    const updateResponse = await updateConversationMessages(conversationId, messages);

    if (!updateResponse.success) {
      // Service function returns success:false if conversation not found or DB error
      // Determine status code based on error message (heuristic)
      const statusCode = updateResponse.error?.toLowerCase().includes('not found') ? 404 : 500;
      console.error(`[DB Route /conversations] Service error updating messages for ${conversationId}:`, updateResponse.error);
      return res.status(statusCode).json(updateResponse);
    }

    // Success
    console.log(`[DB Route /conversations] Successfully updated conversation ${conversationId}`);
    res.status(200).json(updateResponse);
    return;

  } catch (error) {
    console.error('Error in POST /conversations/update-conversation route:', error);
    next(error); // Pass to default error handler
  }
}) as unknown as RequestHandler);


export default router; 