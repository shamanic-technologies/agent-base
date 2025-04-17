/**
 * Conversation Service Proxy Routes
 * 
 * Configures routes under /conversation/* for proxying requests to the Agent Service.
 * It applies authentication, injects necessary headers, and uses the createApiProxy utility.
 */
import express from 'express';
import { createApiProxy } from '../utils/proxy.util.js';
import { injectCustomHeaders } from '../middlewares/header.middleware.js';

/**
 * Configures routes for conversations, proxying them to the Agent Service.
 *
 * @param {express.Router} router - The Express router instance to configure.
 * @param {string} targetServiceUrl - The base URL of the target Agent Service (handling /conversation).
 * @param {express.RequestHandler} authMiddleware - Middleware for authenticating requests.
 * @returns {express.Router} The configured router.
 */
export const configureConversationRoutes = (
  router: express.Router,
  targetServiceUrl: string, // Points to Agent Service
  authMiddleware: express.RequestHandler
) => {

  // Apply authentication middleware first.
  router.use(authMiddleware);

  // Apply the middleware to inject custom headers (x-platform-user-id, etc.)
  router.use(injectCustomHeaders);

  // Create the proxy middleware instance for the Agent Service (handling conversation routes).
  const conversationProxy = createApiProxy(targetServiceUrl, 'Agent Service (Conversations)');

  // Apply the proxy middleware for all paths under the router's mount point.
  router.use(conversationProxy);

  return router;
}; 