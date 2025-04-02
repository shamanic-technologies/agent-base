/**
 * Messages Routes
 * 
 * API endpoints for managing conversation messages
 */
import express, { RequestHandler } from 'express';
import { saveMessage, getMessages } from '../services/messages.js';
import { SaveMessageInput, GetMessagesInput } from '@agent-base/agents';

const router = express.Router();

/**
 * Save a new message
 * POST /
 */
router.post('/', (async (req, res) => {
  try {
    const input: SaveMessageInput = req.body;

    // Basic validation (add more as needed)
    if (!input.conversation_id || !input.user_id || !input.agent_id || !input.role) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: conversation_id, user_id, agent_id, role'
      });
      return;
    }

    const result = await saveMessage(input);
    
    if (!result.success) {
      res.status(500).json(result); // Internal server error if save fails
      return;
    }

    res.status(201).json(result); // 201 Created
  } catch (error) {
    console.error('Error in POST /messages route:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}) as RequestHandler);

/**
 * Get all messages for a conversation
 * GET /?conversation_id=...&user_id=...
 */
router.get('/', (async (req, res) => {
  try {
    // Extract query parameters
    const conversation_id = req.query.conversation_id as string;
    const user_id = req.query.user_id as string;

    // Validate required query parameters
    if (!conversation_id) {
      res.status(400).json({
        success: false,
        error: 'conversation_id query parameter is required'
      });
      return;
    }
    if (!user_id) {
      res.status(400).json({
        success: false,
        error: 'user_id query parameter is required'
      });
      return;
    }

    const input: GetMessagesInput = { conversation_id, user_id };
    const result = await getMessages(input);
    
    // Service handles not found, just check for other errors
    if (!result.success) {
       // Consider returning 404 if data is empty, handled by service currently
       res.status(500).json(result); // Or handle specific errors from service
       return;
    }

    res.status(200).json(result);

  } catch (error) {
    console.error('Error in GET /messages route:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown internal server error'
    });
  }
}) as RequestHandler);

export default router;
