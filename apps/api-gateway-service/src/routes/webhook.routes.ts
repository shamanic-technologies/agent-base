/**
 * Webhook Routes
 * 
 * Configures proxy routes for the Webhook Store Service.
 */
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

/**
 * Configures webhook service proxy routes.
 * 
 * @param router Express Router
 * @param webhookToolApiUrl Base URL for the webhook store service (renamed param)
 * @param authMiddleware Authentication middleware (optional, may be applied globally)
 */
export const configureWebhookRoutes = (
  router: express.Router,
  webhookToolApiUrl: string,
  authMiddleware: express.RequestHandler
) => {
  if (!webhookToolApiUrl) {
    console.error('Webhook Store Service URL not configured!');
    // Optionally throw an error or disable routes
    // throw new Error('Webhook Store Service URL is required.');
    return; // Do not configure routes if URL is missing
  }
  
  if (!process.env.WEBHOOK_STORE_API_KEY) {
    console.error('WEBHOOK_STORE_API_KEY environment variable is not set!');
    // Optionally throw an error or disable routes
    return; // Do not configure routes if API key is missing
  }

  console.log(`Configuring proxy for Webhook Store Service at: ${webhookToolApiUrl}`);

  // Apply auth middleware to all routes proxied by this router if needed
  // If auth is handled globally before routing, this might be redundant
  router.use(authMiddleware);

  // Configure the proxy middleware
  const proxy = createProxyMiddleware({
    target: webhookToolApiUrl,
    changeOrigin: true, // Needed for virtual hosted sites
    pathRewrite: {
      [`^/webhook`]: '', // Remove the /webhook prefix when forwarding
    },
    onProxyReq: (proxyReq, req, res) => {
      // Add the internal API key for the webhook service
      proxyReq.setHeader('Authorization', `Bearer ${process.env.WEBHOOK_STORE_API_KEY}`);
      console.log(`Proxying request to Webhook Store: ${req.method} ${webhookToolApiUrl}${proxyReq.path}`);
    },
    onError: (err, req, res) => {
      console.error('Proxy Error:', err);
      if (!res.headersSent) {
        res.status(500).send('Proxy Error');
      }
    },
    logLevel: 'debug', // Enable detailed proxy logging
  } as any); // Cast to any to bypass TypeScript type checking for event handlers

  // Apply the proxy to all paths handled by this router
  router.use('/', proxy);
}; 