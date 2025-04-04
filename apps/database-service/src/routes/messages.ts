/**
 * Messages Routes
 * 
 * API endpoints for managing conversation messages
 */
import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import { 
  CreateMessageInput, 
  CreateMessageResponse, 
  GetMessagesInput 
} from '@agent-base/agents';
import { createMessage, getMessages } from '../services/messages.js';

const router = express.Router();

/**
 * Create a new message
 * POST /create-message
 * Renamed from POST /create-user-agent-message
 */
router.post('/create-message', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Use renamed input type
    const input: CreateMessageInput = req.body;

    // Basic validation 
    if (!input.conversation_id || !input.role) {
      // Send error response and end
      res.status(400).json({ success: false, error: 'Missing required fields: conversation_id, role' } as CreateMessageResponse);
      return;
    }
    if (!['user', 'assistant', 'system', 'tool'].includes(input.role)) {
       res.status(400).json({ success: false, error: 'Invalid role specified' } as CreateMessageResponse);
       return;
    }

    console.log(`[DB Route /messages] Received request to create message for conv ${input.conversation_id}`);
    // Call renamed service function
    const result = await createMessage(input);
    
    if (!result.success) {
      console.error(`[DB Route /messages] Service failed to create message:`, result.error);
      // Send error response and end
      res.status(500).json(result as CreateMessageResponse);
      return;
    }

    console.log(`[DB Route /messages] Message created successfully with ID: ${result.data?.message_id}`);
    // Send success response and end
    res.status(201).json(result as CreateMessageResponse);

  } catch (error) {
    console.error('Error in POST /messages/create-message route async handler:', error);
    // Pass error to Express error handling middleware
    next(error);
  }
});

/**
 * Get all messages for a conversation
 * GET /get-conversation-messages?conversation_id=...
 * Renamed from GET /get-user-agent-messages
 */
router.get('/get-conversation-messages', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const conversation_id = req.query.conversation_id as string;

    if (!conversation_id) {
      res.status(400).json({ success: false, error: 'conversation_id query parameter is required' });
      return;
    }

    console.log(`[DB Service /messages] Getting messages for conv ${conversation_id}`);
    const input: GetMessagesInput = { conversation_id }; 
    const result = await getMessages(input);
    
    if (!result.success) {
       console.error(`[DB Service /messages] Error getting messages:`, result.error);
       res.status(500).json(result); 
       return;
    }

    console.log(`[DB Service /messages] Retrieved ${result.data?.length ?? 0} messages.`);
    res.status(200).json(result);

  } catch (error) {
    console.error('Error in GET /messages/get-conversation-messages route:', error);
    next(error); 
  }
});

export default router;
