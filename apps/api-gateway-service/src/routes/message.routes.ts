/**
 * Message Service Proxy Routes (/message/*)
 */
import express from 'express';
import axios from 'axios';
import { User } from '../types/index.js';

/**
 * Configure generic forwarding for /message routes
 */
export const configureMessageRoutes = (
  router: express.Router,
  targetServiceUrl: string,
  authMiddleware: express.RequestHandler
) => {

  // Apply auth middleware to all routes in this router
  router.use(authMiddleware);

  // Generic forwarder for all methods and paths under /message
  router.all('*', async (req: express.Request, res: express.Response) => {
    const userId = req.user ? (req.user as User).id : undefined;
    const apiKey = req.headers['x-api-key'] as string;
    const originalPath = req.path.replace('/message', ''); // Get path relative to /message
    const targetUrl = `${targetServiceUrl}/message${originalPath}`; // Append to target service URL
    console.log(`[API Gateway /message] Forwarding ${req.method} ${req.originalUrl} to ${targetUrl} with query ${req.query} for user ${userId}`);
 
    if (!userId) {
      // Should have been caught by authMiddleware, but double-check
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    try {
      const response = await axios({
        method: req.method as any,
        url: targetUrl,
        data: req.body,
        params: req.query, // Forward query parameters
        headers: {
          // Forward relevant headers, add auth headers
          ...req.headers, // Be cautious forwarding all headers; select necessary ones if needed
          'host': new URL(targetServiceUrl).host, // Set correct host header
          'x-user-id': userId, 
          'x-api-key': apiKey, // Forward the validated user API key
        },
        // Handle streaming responses if needed (e.g., for /run)
        // responseType: req.path.includes('stream') ? 'stream' : 'json', // Example conditional streaming
      });

      // Forward status and data
      res.status(response.status).json(response.data);

    } catch (error: any) {
      console.error(`[API Gateway /message] Error forwarding request to ${targetUrl}:`, error.message);
      // Forward error response from target service if possible
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        res.status(500).json({ success: false, error: 'Gateway error forwarding request', details: error.message });
      }
    }
  });

  return router;
}; 