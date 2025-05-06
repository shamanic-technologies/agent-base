/**
 * Webhook Routes
 * 
 * Configures proxy routes for the Webhook Store Service.
 * Applies authentication, injects standard headers, and adds the
 * specific Authorization header required by the Webhook Store Service.
 */
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { injectCustomHeaders } from '../middlewares/header.middleware.js'; // Import header injector

/**
 * Configures webhook service proxy routes.
 * 
 * @param router Express Router
 * @param webhookToolApiUrl Base URL for the webhook store service
 * @param authMiddleware Authentication middleware
 */
export const configureWebhookRoutes = (
  router: express.Router,
  webhookToolApiUrl: string,
  authMiddleware: express.RequestHandler
) => {
  // --- Environment Variable Checks ---
  if (!webhookToolApiUrl) {
    console.error('[WebhookRoutes] Webhook Store Service URL (WEBHOOK_TOOL_API_URL) is not configured!');
    // Throw error to prevent startup with invalid config
    throw new Error('Webhook Store Service URL is required.'); 
  }
  
  const webhookStoreApiKey = process.env.WEBHOOK_STORE_API_KEY;
  if (!webhookStoreApiKey) {
    console.error('[WebhookRoutes] WEBHOOK_STORE_API_KEY environment variable is not set!');
    // Throw error to prevent startup with missing credentials
    throw new Error('WEBHOOK_STORE_API_KEY is required.'); 
  }

  console.log(`[WebhookRoutes] Configuring proxy for Webhook Store Service at: ${webhookToolApiUrl}`);

  // --- Middleware Application Order ---
  // 1. Apply authentication middleware first.
  router.use(authMiddleware);

  // 2. Apply the middleware to inject standard custom headers (x-platform-user-id, etc.)
  router.use(injectCustomHeaders); 

  // --- Proxy Configuration ---
  // Use createProxyMiddleware directly because we need onProxyReq to add the specific API key.
  const webhookProxy = createProxyMiddleware({
    target: webhookToolApiUrl,
    changeOrigin: true, // Needed for virtual hosted sites
    pathRewrite: {
      // Keep path rewrite as the downstream service seems to expect paths without /webhook
      // Example: /webhook/get-created -> /get-created 
      [`^/webhook`]: '', 
    },
    // logLevel: 'info', // Removed as it causes type errors
    // Event Handlers
    on: {
      proxyReq: (proxyReq, req, res) => {
        // Add the specific internal API key for the webhook service
        // This header is required by the webhook-tool-backend service.
        proxyReq.setHeader('Authorization', `Bearer ${webhookStoreApiKey}`);
        
        // Log the actual request being sent to the target service
        console.log(`[WebhookProxy] Proxying request to ${webhookToolApiUrl}${proxyReq.path} (Method: ${req.method})`);
        // console.log('[WebhookProxy] Outgoing Headers:', proxyReq.getHeaders()); // Uncomment for deep debugging
      },
      error: (err, req, res, target) => {
        console.error(`[WebhookProxy] Proxy Error: ${err.message}`, { 
          target: typeof target === 'string' ? target : target?.href, // Handle target type
          clientRequest: `${req.method} ${req.url}`, // Use req.url instead of req.originalUrl
          errorStack: err.stack // Include stack trace for better debugging
        });
        // Ensure response is sent only once using standard ServerResponse methods
        // Check if res is an actual HTTP response object before trying to send headers/body
        if (res instanceof require('http').ServerResponse) {
          // Now we know res is a ServerResponse, so we can safely access its properties
          // @ts-ignore - TS fails to narrow type correctly despite instanceof check
          if (!res.headersSent) { 
            if (res.writable) {
              // @ts-ignore - TS fails to narrow type correctly despite instanceof check
              res.writeHead(502, { 'Content-Type': 'application/json' }); // Use 502 Bad Gateway
              res.end(JSON.stringify({ message: 'Proxy Error', error: err.message }));
            } else {
              res.end(); // If not writable, just end the response abruptly.
            }
          }
        } else {
          // If res is not a ServerResponse (e.g., it's a Socket), we cannot send an HTTP response.
          // The connection might already be closed or in an unusable state.
          // We simply log the error (already done above) and take no further action on `res`.
          console.log('[WebhookProxy] Error occurred, but response object is not a ServerResponse (likely a Socket). Cannot send HTTP error response.');
        }
      },
    }
  });

  // Apply the configured proxy middleware to the router.
  // This will handle all requests coming to the path where this router is mounted.
  router.use(webhookProxy); // Mount at the base path handled by this router instance

  // Return the configured router (optional, Express modifies it in place)
  // return router; // Typically not needed as router is modified by reference
}; 