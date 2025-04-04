/**
 * Conversation Service Proxy Routes (/conversation/*)
 */
import express from 'express';
import axios from 'axios';
import { User } from '../types/index.js';

/**
 * Configure generic forwarding for /conversation routes
 */
export const configureConversationRoutes = (
  router: express.Router,
  targetServiceUrl: string,
  authMiddleware: express.RequestHandler
) => {

  router.use(authMiddleware);

  router.all('*', async (req: express.Request, res: express.Response) => {
    const userId = req.user ? (req.user as User).id : undefined;
    const apiKey = req.headers['x-api-key'] as string;
    const originalPath = req.path.replace('/conversation', ''); 
    const targetUrl = `${targetServiceUrl}/conversation${originalPath}`; 

    console.log(`[API Gateway /conversation] Forwarding ${req.method} ${req.originalUrl} to ${targetUrl} with query ${JSON.stringify(req.query)} for user ${userId}`);

    if (!userId) return res.status(401).json({ success: false, error: 'User not authenticated' });

    try {
      const response = await axios({
        method: req.method as any,
        url: targetUrl,
        data: req.body,
        params: req.query, 
        headers: {
          ...req.headers,
          'host': new URL(targetServiceUrl).host,
          'x-user-id': userId, 
          'x-api-key': apiKey,
          'connection': undefined,
        },
      });
      res.status(response.status).json(response.data);
    } catch (error: any) {
      console.error(`[API Gateway /conversation] Error forwarding request to ${targetUrl}:`, error.message);
      if (error.response) res.status(error.response.status).json(error.response.data);
      else res.status(500).json({ success: false, error: 'Gateway error forwarding request', details: error.message });
    }
  });

  return router;
}; 