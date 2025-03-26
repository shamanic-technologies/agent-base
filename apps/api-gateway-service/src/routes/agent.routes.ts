/**
 * Agent Service Routes
 * 
 * Routes for proxying requests to the Agent Service.
 */
import express from 'express';
import axios from 'axios';
import { User } from '../types/index.js';
import { forwardRequest } from '../utils/request.js';

/**
 * Configure agent routes
 * 
 * @param router Express router
 * @param agentServiceUrl URL of the agent service
 * @param authMiddleware Authentication middleware
 */
export const configureAgentRoutes = (
  router: express.Router,
  agentServiceUrl: string,
  authMiddleware: express.RequestHandler
) => {
  /**
   * Stream endpoint
   * Validates API key and forwards request to agent service stream endpoint
   * Requires API key and conversation_id
   * Uses Server-Sent Events (SSE) for streaming responses
   */
  router.post('/stream', authMiddleware, async (req: express.Request, res: express.Response) => {
    const { conversation_id } = req.body;
    
    // Check if conversation_id is provided
    if (!conversation_id) {
      return res.status(400).json({
        success: false,
        error: 'API Gateway Service: conversation_id is required'
      });
    }
    
    try {
      // Get user info from middleware
      const userId = req.user ? (req.user as User).id : undefined;
      const apiKey = req.headers['x-api-key'] as string | undefined;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'API Gateway Service: User authentication required'
        });
      }
      
      // Set up headers to include user ID and API key if available
      const headers = {
        'Content-Type': 'application/json',
        'x-user-id': userId,
        ...(req.user && (req.user as User).email && { 'x-user-email': (req.user as User).email }),
        ...(req.user && (req.user as User).name && { 'x-user-name': (req.user as User).name }),
        ...(req.user && (req.user as User).provider && { 'x-user-provider': (req.user as User).provider }),
        ...(apiKey && { 'x-api-key': apiKey }),
        'Accept': 'text/event-stream'
      };
      
      console.log(`[API Gateway] Forwarding streaming request to: ${agentServiceUrl}/stream`);
      
      // Create a streaming request to the agent service
      const response = await axios({
        method: 'post',
        url: `${agentServiceUrl}/stream`,
        data: req.body,
        headers: headers,
        responseType: 'stream'
      });
      
      // Set appropriate headers for SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // Pipe the response stream directly
      response.data.pipe(res);
      
      // Handle client disconnect
      req.on('close', () => {
        console.log('[API Gateway] Client disconnected from stream');
      });
    } catch (error) {
      console.error(`[API Gateway] Error forwarding streaming request:`, error);
      
      let statusCode = 500;
      let errorMessage = 'API Gateway Service: Error streaming response';
      let errorDetails = 'Unknown error';
      
      // Handle axios errors
      if (axios.isAxiosError(error)) {
        if (!error.response) {
          // Connection error
          statusCode = 502; // Bad Gateway
          errorMessage = `API Gateway Service: Could not connect to agent service`;
          errorDetails = error.message;
        } else {
          // Service returned an error response
          statusCode = error.response.status;
          errorMessage = error.response.data?.error || errorMessage;
          errorDetails = error.response.data?.details || error.message;
        }
      } else if (error instanceof Error) {
        errorDetails = error.message;
      }
      
      return res.status(statusCode).json({
        success: false,
        error: errorMessage,
        details: errorDetails
      });
    }
  });

  return router;
}; 