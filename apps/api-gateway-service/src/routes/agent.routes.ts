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
   */
  router.post('/stream', authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      // Extract user ID from auth middleware
      const userId = req.user ? (req.user as User).id : undefined;
      
      if (!userId) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
      }
      const apiKey = req.headers['x-api-key'] as string;
      console.log(`[API Gateway] API key: ${apiKey}`);
      
      // Forward to agent service with userId in header
      const response = await axios({
        method: 'post',
        url: `${agentServiceUrl}/stream`,
        data: req.body,
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
          'x-api-key': apiKey,
          'Accept': 'text/event-stream'
        },
        responseType: 'stream'
      });
      
      // Set headers for streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // Stream response directly
      response.data.pipe(res);
    } catch (error) {
      console.error('[API Gateway] Error forwarding stream request:', error);
      res.status(500).json({ success: false, error: 'Failed to process request' });
    }
  });
  
  /**
   * Create agent endpoint
   */
  router.post('/create', authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      // Extract user ID from auth middleware
      const userId = req.user ? (req.user as User).id : undefined;
      
      if (!userId) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
      }
      const apiKey = req.headers['x-api-key'] as string;
      console.log(`[API Gateway] API key: ${apiKey}`);
      
      // Forward to agent service with userId in header
      const response = await axios({
        method: 'post',
        url: `${agentServiceUrl}/agent/create`,
        data: req.body,
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
          'x-api-key': apiKey
        }
      });
      
      res.status(response.status).json(response.data);
    } catch (error) {
      console.error('[API Gateway] Error forwarding create request:', error);
      res.status(500).json({ success: false, error: 'Failed to process request' });
    }
  });

  /**
   * Update agent endpoint
   */
  router.post('/update', authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      // Extract user ID from auth middleware
      const userId = req.user ? (req.user as User).id : undefined;
      
      if (!userId) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
      }
      const apiKey = req.headers['x-api-key'] as string;
      console.log(`[API Gateway] API key: ${apiKey}`);
      
      // Forward to agent service with userId in header
      const response = await axios({
        method: 'post',
        url: `${agentServiceUrl}/agent/update`,
        data: req.body,
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
          'x-api-key': apiKey
        }
      });
      
      res.status(response.status).json(response.data);
    } catch (error) {
      console.error('[API Gateway] Error forwarding update request:', error);
      res.status(500).json({ success: false, error: 'Failed to process request' });
    }
  });

  /**
   * List agents endpoint
   */
  router.get('/list', authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      // Extract user ID from auth middleware
      const userId = req.user ? (req.user as User).id : undefined;
      
      if (!userId) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
      }
      const apiKey = req.headers['x-api-key'] as string;
      console.log(`[API Gateway] API key: ${apiKey}`);
      
      // Forward to agent service with userId in header
      const response = await axios({
        method: 'get',
        url: `${agentServiceUrl}/agent/list`,
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
          'x-api-key': apiKey
        }
      });
      
      res.status(response.status).json(response.data);
    } catch (error) {
      console.error('[API Gateway] Error forwarding list request:', error);
      res.status(500).json({ success: false, error: 'Failed to process request' });
    }
  });

  return router;
}; 