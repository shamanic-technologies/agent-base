/**
 * Utility Service Routes
 * 
 * Configures routes that proxy requests to the utility service.
 * Applies authentication, injects headers, and uses the proxy utility.
 */
import express from 'express';
import { createApiProxy } from '../utils/proxy.util.js';
import { injectCustomHeaders } from '../middlewares/header.middleware.js';

/**
 * Configure utility service routes
 * 
 * @param {express.Router} router - The Express router instance to configure.
 * @param {string} targetServiceUrl - The base URL of the target Utility Tool Service.
 * @param {express.RequestHandler} authMiddleware - Middleware for authenticating requests.
 * @returns {express.Router} The configured router.
 */
export const configureUtilityRoutes = (
  router: express.Router,
  targetServiceUrl: string, // Renamed from serviceUrl for consistency
  authMiddleware: express.RequestHandler
) => {

  // Apply authentication middleware first.
  router.use(authMiddleware);

  // Apply the middleware to inject custom headers (x-platform-user-id, etc.)
  router.use(injectCustomHeaders);

  // Create the proxy middleware instance for the Utility Tool Service.
  const utilityProxy = createApiProxy(targetServiceUrl, 'Utility Tool Service');

  // Apply the proxy middleware. It will forward requests based on their original path.
  // e.g., a request to /call-tool/:id will be proxied to targetServiceUrl/call-tool/:id
  router.use(utilityProxy);

  // No need to define specific routes here anymore, the proxy handles forwarding.

  return router;
}; 