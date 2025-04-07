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
    CreateConversationResponse,
    GetConversationsResponse,
    ConversationRecord,
    GetConversationsFromAgentInput,
    BaseResponse,
    UpdateConversationInput,
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
router.get('/get-conversations-from-agent', (async (req: Request, res: Response, next: NextFunction) => {
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
    return;

  } catch (error) {
    console.error('Error in GET /conversations/get-conversations-from-agent route:', error);
    next(error); 
  }
}) as unknown as RequestHandler);

/**
 * Get conversations for an agent, or create a default one if none exist.
 * GET /get-or-create-conversations-from-agent?agent_id=...
 */
router.get('/get-or-create-conversations-from-agent', (async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agent_id = req.query.agent_id as string;

    if (!agent_id) {
      return res.status(400).json({ success: false, error: 'agent_id query parameter is required' } as GetConversationsResponse);
    }

    console.log(`[DB Route /conversations] Getting or creating conversation for agent ${agent_id}`);
    const getInput: GetConversationsFromAgentInput = { agent_id };
    const getResult = await getConversationsByAgent(getInput);

    // Handle errors during fetch
    if (!getResult.success) {
      console.error(`[DB Route /conversations] Service error getting conversations for agent ${agent_id}:`, getResult.error);
      return res.status(500).json(getResult as GetConversationsResponse);
    }

    // If conversations exist, return them
    if (getResult.data && getResult.data.length > 0) {
      console.log(`[DB Route /conversations] Found ${getResult.data.length} existing conversations for agent ${agent_id}.`);
      res.status(200).json(getResult as GetConversationsResponse);
      return;
    }

    // If no conversations exist, create a new one
    console.log(`[DB Route /conversations] No conversations found for agent ${agent_id}. Creating a new one.`);
    const newConversationId = randomUUID();
    const defaultChannelId = 'web'; 

    const createInput: CreateConversationInput = {
      conversation_id: newConversationId,
      agent_id: agent_id,
      channel_id: defaultChannelId
    };

    const createResult = await createConversation(createInput);

    // Handle errors during creation
    if (!createResult.success || !createResult.data?.conversation_id) {
      console.error(`[DB Route /conversations] Failed to create conversation for agent ${agent_id}:`, createResult.error);
      return res.status(500).json({ 
        success: false, 
        error: `Failed to create initial conversation: ${createResult.error || 'Unknown error'}` 
      } as GetConversationsResponse); // Return error within the expected response structure
    }

    // Construct the new conversation record to return
    const newConversation: ConversationRecord = {
      conversation_id: createResult.data.conversation_id,
      agent_id: agent_id,
      channel_id: defaultChannelId,
      messages: [], // Initialize with empty messages
      created_at: new Date(), // Use current date
      updated_at: new Date()  // Use current date
    };

    console.log(`[DB Route /conversations] Created new conversation ${newConversation.conversation_id} for agent ${agent_id}.`);
    // Return the newly created conversation within the GetConversationsResponse structure
    res.status(201).json({
      success: true,
      data: [newConversation]
    } as GetConversationsResponse);
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
router.get('/get-conversation/:conversation_id', (async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { conversation_id } = req.params;

    if (!conversation_id) {
      // This case should ideally be caught by Express routing itself
      return res.status(400).json({ success: false, error: 'conversation_id path parameter is required' });
    }

    console.log(`[DB Route /conversations] Getting single conversation ${conversation_id}`);
    // Directly call the service function
    const result = await getConversation(conversation_id);

    if (!result.success) {
      const statusCode = result.error?.toLowerCase().includes('not found') ? 404 : 500;
      console.error(`[DB Route /conversations] Service error getting conversation ${conversation_id}:`, result.error);
      return res.status(statusCode).json(result);
    }

    // Success case
    console.log(`[DB Route /conversations] Successfully retrieved conversation ${conversation_id}`);
    res.status(200).json(result);
    return;

  } catch (error) {
    console.error('Error in GET /conversations/get-conversation/:conversation_id route:', error);
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
    const { conversation_id, messages } = input; // Destructure after validation

    // --- Validation ---
    // Basic validation (can be enhanced, e.g., with Zod)
    if (!conversation_id) {
      return res.status(400).json({ success: false, error: 'conversation_id is required' } as BaseResponse);
    }
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ success: false, error: 'messages is required and must be an array' } as BaseResponse);
    }
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

    // Success
    console.log(`[DB Route /conversations] Successfully updated conversation ${conversation_id}`);
    res.status(200).json(result);
    return;

  } catch (error) {
    console.error('Error in POST /conversations/update-conversation route:', error);
    next(error); // Pass to default error handler
  }
}) as unknown as RequestHandler);


export default router; 