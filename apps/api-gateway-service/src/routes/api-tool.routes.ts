/**
 * API Tool Routes
 *
 * Configures proxy routes for the API Tool Service.
 * Applies authentication, injects standard headers, and adds the
 * specific Authorization header required by the API Tool Service.
 */
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { injectCustomHeaders } from '../middlewares/header.middleware.js'; // Import header injector

/**
 * Configures API Tool service proxy routes.
 *
 * @param router Express Router
 * @param apiToolServiceUrl Base URL for the API Tool service
 * @param authMiddleware Authentication middleware
 */
export const configureApiToolRoutes = (
  router: express.Router,
  apiToolServiceUrl: string,
  authMiddleware: express.RequestHandler
) => {
  // --- Environment Variable Checks ---
  if (!apiToolServiceUrl) {
    console.error('[ApiToolRoutes] API Tool Service URL (API_TOOL_API_URL) is not configured!');
    // Throw error to prevent startup with invalid config
    throw new Error('API Tool Service URL is required.');
  }

  const apiToolApiKey = process.env.API_TOOL_API_KEY;
  if (!apiToolApiKey) {
    console.error('[ApiToolRoutes] API_TOOL_API_KEY environment variable is not set!');
    // Throw error to prevent startup with missing credentials
    throw new Error('API_TOOL_API_KEY is required.');
  }

  console.log(`[ApiToolRoutes] Configuring proxy for API Tool Service at: ${apiToolServiceUrl}`);

  // --- Middleware Application Order ---
  // 1. Apply authentication middleware first.
  router.use(authMiddleware);

  // 2. Apply the middleware to inject standard custom headers (x-platform-user-id, etc.)
  router.use(injectCustomHeaders);

  // --- Proxy Configuration ---
  // Use createProxyMiddleware directly because we need onProxyReq to add the specific API key.
  const apiToolProxy = createProxyMiddleware({
    target: apiToolServiceUrl,
    changeOrigin: true, // Needed for virtual hosted sites
    pathRewrite: {
      // Rewrite path: /api-tool/some-path -> /some-path
      [`^/api-tool`]: '',
    },
    // logLevel: 'info', // Removed as it causes type errors with older http-proxy-middleware versions
    // Event Handlers
    on: {
      proxyReq: (proxyReq, req, res) => {
        // Add the specific internal API key for the API Tool service
        // This header is required by the api-tool-backend service.
        proxyReq.setHeader('Authorization', `Bearer ${apiToolApiKey}`);

        // Log the actual request being sent to the target service
        // Construct the full target URL for accurate logging
        const targetUrl = new URL(proxyReq.path, apiToolServiceUrl);
        console.log(`[ApiToolProxy] Proxying request to ${targetUrl.href} (Method: ${req.method})`);
        // console.log('[ApiToolProxy] Outgoing Headers:', proxyReq.getHeaders()); // Uncomment for deep debugging
      },
      error: (err, req, res, target) => {
        console.error(`[ApiToolProxy] Proxy Error: ${err.message}`, {
          target: typeof target === 'string' ? target : target?.href, // Handle target type
          clientRequest: `${req.method} ${req.url}`, // Use req.url
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
          console.log('[ApiToolProxy] Error occurred, but response object is not a ServerResponse (likely a Socket). Cannot send HTTP error response.');
        }
      },
    }
  });

  // Apply the configured proxy middleware to the router.
  // This will handle all requests coming to the path where this router is mounted.
  router.use(apiToolProxy); // Mount at the base path handled by this router instance

  // Return the configured router (optional, Express modifies it in place)
  // return router; // Typically not needed as router is modified by reference
}; 