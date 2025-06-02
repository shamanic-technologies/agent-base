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
    getConversationsByClientUserId
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

    const input: AgentId = { agentId };
    const getResponse = await getConversationsByAgent(input);
    
    // Handle service errors
    if (!getResponse.success) {
       console.error(`[DB Route /conversations] Service error getting conversations:`, getResponse.error);
       res.status(500).json(getResponse); 
       return;
    }

    // Return 200 OK with the data (potentially empty array)
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
      console.error('[DB Route /conversations] agentId query parameter is required');
      return res.status(400).json({ success: false, error: 'agentId query parameter is required' } as ErrorResponse);
    }

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
    const conversationId = req.params.conversationId;

    if (!conversationId) {
      console.error('[DB Route /conversations] conversationId path parameter is required');
      // This case should ideally be caught by Express routing itself
      return res.status(400).json({ success: false, error: 'conversationId path parameter is required' });
    }

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
      console.error('[DB Route /conversations] conversationId is required');
      return res.status(400).json({ success: false, error: 'conversation_id is required' } as ErrorResponse);
    }
    if (!messages || !Array.isArray(messages)) {
      console.error('[DB Route /conversations] messages is required and must be an array');
      return res.status(400).json({ success: false, error: 'messages is required and must be an array' } as BaseResponse);
    }
    // --- End Validation ---

    const updateResponse = await updateConversationMessages(conversationId, messages);

    if (!updateResponse.success) {
      // Service function returns success:false if conversation not found or DB error
      // Determine status code based on error message (heuristic)
      const statusCode = updateResponse.error?.toLowerCase().includes('not found') ? 404 : 500;
      console.error(`[DB Route /conversations] Service error updating messages for ${conversationId}:`, updateResponse.error);
      return res.status(statusCode).json(updateResponse);
    }

    // Success
    res.status(200).json(updateResponse);
    return;

  } catch (error) {
    console.error('Error in POST /conversations/update-conversation route:', error);
    next(error); // Pass to default error handler
  }
}) as unknown as RequestHandler);

/**
 * Get all conversations for a given clientUserId
 * GET /get-all-user-conversations?clientUserId=...
 */
router.get('/get-all-user-conversations', (async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientUserId = req.headers['x-client-user-id'] as string;
    const clientOrganizationId = req.headers['x-client-organization-id'] as string;

    if (!clientUserId) {
      console.error('[DB Route /conversations] clientUserId query parameter is required');
      return res.status(400).json({ success: false, error: 'clientUserId query parameter is required' } as ErrorResponse);
    }

    if (!clientOrganizationId) {
      console.error('[DB Route /conversations] clientOrganizationId query parameter is required');
      return res.status(400).json({ success: false, error: 'clientOrganizationId query parameter is required' } as ErrorResponse);
    }

    const response = await getConversationsByClientUserId(clientUserId, clientOrganizationId);

    if (!response.success) {
      console.error(`[DB Route /conversations] Service error getting all conversations for client_user_id ${clientUserId}:`, response.error);
      // Use 500 for service errors, but could be more specific if service provides error codes
      return res.status(500).json(response);
    }

    // Success case
    res.status(200).json(response);

  } catch (error) {
    console.error('Error in GET /conversations/get-all-user-conversations route:', error);
    // Pass to default error handler or send a generic 500 response
    if (!res.headersSent) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown internal server error'
        } as ErrorResponse);
    }
    // Optionally, call next(error) if you have a centralized error handling middleware that handles sending responses
  }
}) as unknown as RequestHandler);

export default router; 