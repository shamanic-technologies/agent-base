/**
 * LangGraph Conversations Routes
 * 
 * API endpoints for managing LangGraph conversations
 */
import express, { RequestHandler, Request, Response, NextFunction } from 'express';
import { BaseMessage } from '@langchain/core/messages';
import { randomUUID } from 'crypto';
import {  
    CreateConversationInput,
    AgentId,
    ErrorResponse,
    ServiceResponse,
    ConversationLanggraph,
} from '@agent-base/types';
import { UpdateConversationLanggraphInput } from '@agent-base/types';
import {
    createConversationLangGraph,
    getConversationLangGraph,
    getConversationsByAgentLangGraph,
    updateConversationMessagesLangGraph,
    getConversationsByClientUserIdLangGraph,
    getConversationsByPlatformUserIdLangGraph
} from '../services/conversations-langgraph.js';

const router = express.Router();

/**
 * Create a new LangGraph conversation
 */
router.post('/create-conversation-langgraph', (async (req: Request, res: Response) => {
  try {
    const { conversationId, agentId, channelId }: CreateConversationInput = req.body;

    if (!conversationId || !agentId || !channelId) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: conversationId, agentId, channelId'
      } as ErrorResponse);
      return;
    }

    const createResponse = await createConversationLangGraph(req.body);
    
    if (!createResponse.success) {
        res.status(500).json(createResponse);
        return;
    }

    res.status(200).json(createResponse);

  } catch (error) {
    console.error('Error in POST /create-conversation-langgraph route:', error);
    if (!res.headersSent) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown internal server error'
        } as ErrorResponse);
    }
  }
}) as RequestHandler);

/**
 * Get all LangGraph conversations for an agent
 */
router.get('/get-conversations-from-agent-langgraph', (async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = req.query.agentId as string;

    if (!agentId) {
      res.status(400).json({ success: false, error: 'agentId query parameter is required' } as ErrorResponse);
      return;
    }

    const input: AgentId = { agentId };
    const getResponse = await getConversationsByAgentLangGraph(input);
    
    if (!getResponse.success) {
       res.status(500).json(getResponse); 
       return;
    }

    res.status(200).json(getResponse);
    return;

  } catch (error) {
    console.error('Error in GET /get-conversations-from-agent-langgraph route:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown internal server error'
    } as ErrorResponse);
    next(error); 
  }
}) as unknown as RequestHandler);

/**
 * Get or create LangGraph conversations for an agent
 */
router.get('/get-or-create-conversations-from-agent-langgraph', (async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = req.query.agentId as string;

    if (!agentId) {
      return res.status(400).json({ success: false, error: 'agentId query parameter is required' } as ErrorResponse);
    }

    const getInput: AgentId = { agentId };
    const getConversationsResponse = await getConversationsByAgentLangGraph(getInput);

    if (!getConversationsResponse.success) {
      return res.status(500).json(getConversationsResponse);
    }

    if (getConversationsResponse.data && getConversationsResponse.data.length > 0) {
      res.status(200).json(getConversationsResponse);
      return;
    }

    const newConversationId = randomUUID();
    const defaultChannelId = 'web'; 

    const createInput: CreateConversationInput = {
      conversationId: newConversationId,
      agentId: agentId,
      channelId: defaultChannelId,
      langGraphThreadId: null
    };

    const createResponse : ServiceResponse<ConversationLanggraph> = await createConversationLangGraph(createInput);

    if (!createResponse.success) {
      return res.status(500).json(createResponse);
    }

    res.status(201).json([createResponse.data]);
    return;

  } catch (error) {
    console.error('Error in GET /get-or-create-conversations-from-agent-langgraph route:', error);
    next(error);
  }
}) as unknown as RequestHandler);

/**
 * Get a specific LangGraph conversation by ID
 */
router.get('/get-conversation-langgraph/:conversationId', (async (req: Request, res: Response, next: NextFunction) => {
  try {
    const conversationId = req.params.conversationId;

    if (!conversationId) {
      return res.status(400).json({ success: false, error: 'conversationId path parameter is required' });
    }

    const getResponse = await getConversationLangGraph(conversationId);

    if (!getResponse.success) {
      return res.status(500).json(getResponse);
    }

    res.status(200).json(getResponse);
    return;

  } catch (error) {
    console.error('Error in GET /get-conversation-langgraph/:conversationId route:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown internal server error'
    } as ErrorResponse);
    next(error);
  }
}) as unknown as RequestHandler);

/**
 * Update the messages array for a specific LangGraph conversation
 */
router.post('/update-conversation-langgraph', (async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input: UpdateConversationLanggraphInput = req.body;
    const { conversationId, messages } = input;

    if (!conversationId) {
      return res.status(400).json({ success: false, error: 'conversation_id is required' } as ErrorResponse);
    }
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ success: false, error: 'messages is required and must be an array' } as ErrorResponse);
    }

    const updateResponse = await updateConversationMessagesLangGraph(conversationId, messages);

    if (!updateResponse.success) {
      const statusCode = updateResponse.error.toLowerCase().includes('not found') ? 404 : 500;
      return res.status(statusCode).json(updateResponse);
    }

    res.status(200).json(updateResponse);
    return;

  } catch (error) {
    console.error('Error in POST /update-conversation-langgraph route:', error);
    next(error);
  }
}) as unknown as RequestHandler);

/**
 * Get all LangGraph conversations for a given clientUserId
 */
router.get('/get-all-user-conversations-langgraph', (async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientUserId = req.headers['x-client-user-id'] as string;
    const clientOrganizationId = req.headers['x-client-organization-id'] as string;

    if (!clientUserId) {
      return res.status(400).json({ success: false, error: 'clientUserId query parameter is required' } as ErrorResponse);
    }

    if (!clientOrganizationId) {
      return res.status(400).json({ success: false, error: 'clientOrganizationId query parameter is required' } as ErrorResponse);
    }

    const response = await getConversationsByClientUserIdLangGraph(clientUserId, clientOrganizationId);

    if (!response.success) {
      return res.status(500).json(response);
    }

    res.status(200).json(response);

  } catch (error) {
    console.error('Error in GET /get-all-user-conversations-langgraph route:', error);
    if (!res.headersSent) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown internal server error'
        } as ErrorResponse);
    }
  }
}) as unknown as RequestHandler);

/**
 * Get all LangGraph conversations for a given platformUserId
 */
router.get('/get-all-platform-user-conversations-langgraph', (async (req: Request, res: Response, next: NextFunction) => {
  try {
    const platformUserId = req.headers['x-platform-user-id'] as string;

    if (!platformUserId) {
      return res.status(400).json({ success: false, error: 'platformUserId header is required' } as ErrorResponse);
    }

    const response = await getConversationsByPlatformUserIdLangGraph(platformUserId);

    if (!response.success) {
      return res.status(500).json(response);
    }

    res.status(200).json(response);

  } catch (error) {
    console.error('Error in GET /get-all-platform-user-conversations-langgraph route:', error);
    if (!res.headersSent) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown internal server error'
        } as ErrorResponse);
    }
  }
}) as unknown as RequestHandler);

export default router; 