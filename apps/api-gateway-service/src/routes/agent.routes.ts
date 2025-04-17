/**
 * Agent Service Routes
 * 
 * Routes for proxying requests to the Agent Service.
 */
import express from 'express';
import axios from 'axios';

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
    const platformUserId = req.platformUserId ? req.platformUserId : undefined;
    const platformApiKey = req.platformApiKey ? req.platformApiKey : undefined;
    const clientUserId = req.clientUserId ? req.clientUserId : undefined;
    // Construct target URL on the agent service
    const targetUrl = `${targetServiceUrl}${req.originalUrl}`; 

    console.log(`[API Gateway /agent] Forwarding ${req.method} ${req.originalUrl} to ${targetUrl} with query ${req.query} for user ${platformUserId}`);

    if (!platformUserId) return res.status(401).json({ success: false, error: 'Platform User not authenticated' });
    if (!platformApiKey) return res.status(401).json({ success: false, error: 'Platform API key not provided' });
    if (!clientUserId) return res.status(401).json({ success: false, error: 'Client User not provided' });

    try {
      const response = await axios({
        method: req.method as any,
        url: targetUrl,
        data: req.body,
        params: req.query, // Forward query params
        headers: {
          ...req.headers,
          'host': new URL(targetServiceUrl).host,
          'x-platform-user-id': platformUserId,
          'x-platform-api-key': platformApiKey,
          'x-client-user-id': clientUserId,
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