/**
 * Stream routes
 * 
 * Endpoints for AI streaming functionality
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import { createAgent } from '../lib/agent.js';
// @ts-ignore
import { ToolExecutionError, InvalidToolArgumentsError, NoSuchToolError } from 'ai';

const router = Router();

/**
 * Stream endpoint for AI text generation with streaming responses
 * Follows Server-Sent Events (SSE) protocol compatible with Vercel AI SDK
 */
router.post('/', function(req: Request, res: Response) {
  const { messages, conversation_id } = req.body;
  console.log(`[Agent Service]: Streaming request received` + JSON.stringify(messages));
  console.log(`[Agent Service]: Streaming request received` + conversation_id);
  
  // Extract user ID from req.user (set by auth middleware)
  const userId = (req as any).user?.id as string;
  const apiKey = req.headers['x-api-key'] as string;
  
  // Validate required parameters
  if (!messages) {
    return res.status(400).json({ 
      error: '[Agent Service] Messages is required',
      details: 'Please provide messages in the request body'
    });
  }
  
  if (!userId) {
    return res.status(401).json({ 
      error: '[Agent Service] User authentication required',
      details: 'User ID not found in request'
    });
  }

  if (!conversation_id) {
    return res.status(400).json({ 
      error: '[Agent Service] conversation_id is required',
      details: 'Please provide a conversation_id in the request body'
    });
  }
  
  (async () => {
    try {
      // Verify API key configuration
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('Anthropic API key not found in environment variables');
      }
      
      // Process the request with our streaming agent
      console.log(`[Agent Service] Processing request for user:${userId}, conversation:${conversation_id}`);
      
      // Create the agent with credentials
      const agent = await createAgent({
        userId,
        conversationId: conversation_id,
        apiKey
      });
      console.log(`[Agent Service]:` + messages);
      // Get the streaming result from the agent
      const stream = await agent.stream(messages);
      
      // Stream directly to Express response
      // @ts-ignore - StreamResult includes pipeDataStreamToResponse method
      await stream.pipeDataStreamToResponse(res, {
        getErrorMessage: error => {
          if (NoSuchToolError.isInstance(error)) {
            return 'The model tried to call a unknown tool: ' + error.toolName;
          } else if (InvalidToolArgumentsError.isInstance(error)) {
            return 'The model called a tool with invalid arguments: ' + error.toolName;
          } else if (ToolExecutionError.isInstance(error)) {
            return 'An error occurred during tool execution: ' + error.toolName;
          } else {
            return 'An unknown error occurred.';
          }
        },
      });
      
    } catch (error) {
      console.error('[Agent Service] Error streaming message with agent:', error);
      
      // Structured error response
      res.status(500).json({ 
        error: 'Failed to process message',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  })();
});

export default router; 