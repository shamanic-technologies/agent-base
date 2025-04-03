/**
 * Run Service Proxy Routes (/run/*)
 */
import express from 'express';
import axios from 'axios';
import { User } from '../types/index.js';

/**
 * Configure generic forwarding for /run routes
 */
export const configureRunRoutes = (
  router: express.Router,
  targetServiceUrl: string,
  authMiddleware: express.RequestHandler
) => {

  router.use(authMiddleware);

  router.all('*', async (req: express.Request, res: express.Response) => {
    const userId = req.user ? (req.user as User).id : undefined;
    const apiKey = req.headers['x-api-key'] as string;
    const originalPath = req.originalUrl.replace('/run', ''); 
    const targetUrl = `${targetServiceUrl}/run${originalPath}`; 
    const isStreaming = req.headers.accept?.includes('text/event-stream');

    console.log(`[API Gateway /run] Forwarding ${req.method} ${req.originalUrl} to ${targetUrl} for user ${userId} (Streaming: ${!!isStreaming})`);

    if (!userId) return res.status(401).json({ success: false, error: 'User not authenticated' });

    try {
      const response = await axios({
        method: req.method as any,
        url: targetUrl,
        data: req.body,
        params: req.query,
        // Set responseType to stream if the client accepts it
        responseType: isStreaming ? 'stream' : 'json',
        headers: {
          ...req.headers,
          'host': new URL(targetServiceUrl).host,
          'x-user-id': userId,
          'x-api-key': apiKey,
          'connection': isStreaming ? 'keep-alive' : undefined, // Keep-alive for streams
          // Ensure Accept header is passed if client sent it
          'accept': req.headers.accept || undefined, 
        },
      });

      // Handle streaming vs JSON response
      if (isStreaming && response.data?.pipe) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        response.data.pipe(res);
      } else {
        res.status(response.status).json(response.data);
      }

    } catch (error: any) {
      console.error(`[API Gateway /run] Error forwarding request to ${targetUrl}:`, error.message);
      if (error.response) {
        // Try to forward error structure, handling potential stream errors
        if (error.response.data && typeof error.response.data === 'object') {
             res.status(error.response.status).json(error.response.data);
        } else {
             res.status(error.response.status).send(error.response.data || 'Unknown service error');
        }
      } else {
        res.status(500).json({ success: false, error: 'Gateway error forwarding request', details: error.message });
      }
    }
  });

  return router;
}; 