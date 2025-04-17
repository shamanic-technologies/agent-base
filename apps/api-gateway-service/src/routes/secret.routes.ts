/**
 * Secret Service Routes
 * 
 * Configures routes that proxy requests to the Secret Service.
 * Applies authentication, injects headers, and uses the proxy utility.
 * NOTE: This currently proxies paths directly (e.g., /set_stripe_api_keys -> TARGET/set_stripe_api_keys).
 *       Downstream service might need adjustment to match these paths.
 */
import express from 'express';
import { createApiProxy } from '../utils/proxy.util.js';
import { injectCustomHeaders } from '../middlewares/header.middleware.js';

/**
 * Configure secret service routes
 * 
 * @param {express.Router} router - The Express router instance to configure.
 * @param {string} targetServiceUrl - The base URL of the target Secret Service.
 * @param {express.RequestHandler} authMiddleware - Middleware for authenticating requests.
 * @returns {express.Router} The configured router.
 */
export const configureSecretRoutes = (
  router: express.Router,
  targetServiceUrl: string, // Renamed from serviceUrl for consistency
  authMiddleware: express.RequestHandler
) => {

  // Apply authentication middleware first.
  router.use(authMiddleware);

  // Apply the middleware to inject custom headers (x-platform-user-id, etc.)
  router.use(injectCustomHeaders);

  // Create the proxy middleware instance for the Secret Service (no path rewrite).
  const secretProxy = createApiProxy(targetServiceUrl, 'Secret Service');

  // Apply the proxy middleware. It will forward requests based on their original path.
  // e.g., a POST request to /set_stripe_api_keys will be proxied to targetServiceUrl/set_stripe_api_keys
  router.use(secretProxy);

  // No need to define specific routes here anymore, the proxy handles forwarding.

  return router;
}; 