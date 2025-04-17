/**
 * Message Service Proxy Routes
 * 
 * Configures routes under /message/* for proxying requests to the Agent Service.
 * It applies authentication, injects necessary headers, and uses the createApiProxy utility.
 */
import express from 'express';
import { createApiProxy } from '../utils/proxy.util.js';
import { injectCustomHeaders } from '../middlewares/header.middleware.js';

/**
 * Configures routes for messages, proxying them to the Agent Service.
 *
 * @param {express.Router} router - The Express router instance to configure.
 * @param {string} targetServiceUrl - The base URL of the target Agent Service (handling /message).
 * @param {express.RequestHandler} authMiddleware - Middleware for authenticating requests.
 * @returns {express.Router} The configured router.
 */
export const configureMessageRoutes = (
  router: express.Router,
  targetServiceUrl: string, // Points to Agent Service
  authMiddleware: express.RequestHandler
) => {

  // Apply authentication middleware first.
  router.use(authMiddleware);

  // Apply the middleware to inject custom headers (x-platform-user-id, etc.)
  router.use(injectCustomHeaders);

  // Create the proxy middleware instance for the Agent Service (handling message routes).
  const messageProxy = createApiProxy(targetServiceUrl, 'Agent Service (Messages)');

  // Apply the proxy middleware for all paths under the router's mount point.
  router.use(messageProxy);

  return router;
}; 