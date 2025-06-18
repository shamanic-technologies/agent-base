/**
 * User Service Routes
 * 
 * Configures the proxy routes for the User Service.
 */
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import http from 'http';

export const configureUserRoutes = (
  router: express.Router,
  userServiceUrl: string,
  authMiddleware: express.RequestHandler
) => {
  if (!userServiceUrl) {
    throw new Error('User Service URL is required.');
  }

  router.use(authMiddleware);

  const userProxy = createProxyMiddleware({
    target: userServiceUrl,
    changeOrigin: true,
    on: {
      error: (err, req, res) => {
        console.error(`[UserProxy] Proxy Error: ${err.message}`);
        const serverResponse = res as http.ServerResponse;
        if (!serverResponse.headersSent) {
          serverResponse.writeHead(502, { 'Content-Type': 'application/json' });
          serverResponse.end(JSON.stringify({ message: 'Proxy Error', error: err.message }));
        }
      },
    }
  });

  router.use('/', userProxy);
}; 