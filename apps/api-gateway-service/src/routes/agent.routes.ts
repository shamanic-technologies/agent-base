/**
 * Agent Service Routes
 * 
 * Routes for proxying requests to the Agent Service.
 */
import express from 'express';
import axios from 'axios';
import { User } from '../types/index.js';

/**
 * Configure generic forwarding for /agent routes
 */
export const configureAgentRoutes = (
  router: express.Router,
  targetServiceUrl: string,
  authMiddleware: express.RequestHandler
) => {

  router.use(authMiddleware);

  // Generic forwarder for all methods and paths under /agent
  router.all('*', async (req: express.Request, res: express.Response) => {
      const userId = req.user ? (req.user as User).id : undefined;
    const apiKey = req.headers['x-api-key'] as string;
    // Get path relative to /agent mount point
    const originalPath = req.path.replace('/agent', ''); 
    // Construct target URL on the agent service
    const targetUrl = `${targetServiceUrl}/agent${originalPath}`; 

    console.log(`[API Gateway /agent] Forwarding ${req.method} ${req.originalUrl} to ${targetUrl} for user ${userId}`);

    if (!userId) return res.status(401).json({ success: false, error: 'User not authenticated' });

    try {
      const response = await axios({
        method: req.method as any,
        url: targetUrl,
        data: req.body,
        params: req.query, // Forward query params
        headers: {
          ...req.headers,
          'host': new URL(targetServiceUrl).host,
          'x-user-id': userId,
          'x-api-key': apiKey,
          'connection': undefined,
        },
      });
      // Forward status and data
      res.status(response.status).json(response.data);

    } catch (error: any) {
      console.error(`[API Gateway /agent] Error forwarding request to ${targetUrl}:`, error.message);
      // Forward error response if possible
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        res.status(500).json({ success: false, error: 'Gateway error forwarding request', details: error.message });
      }
    }
  });

  return router;
}; 