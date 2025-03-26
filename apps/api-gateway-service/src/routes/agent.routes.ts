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
    
    // Forward the request to the agent service stream endpoint
    return forwardRequest(req, res, agentServiceUrl, '/stream');
  });

  return router;
}; 