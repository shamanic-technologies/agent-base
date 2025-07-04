/**
 * Agent Service Routes
 * 
 * Configures routes for proxying requests to the backend Agent Service.
 * It applies authentication and then uses the createApiProxy utility.
 */
import express from 'express';
import { createApiProxy } from '../utils/proxy.util.js';

// Request type augmentation is handled globally via src/types/index.ts

/**
 * Configures routes related to agents, proxying them to the Agent Service.
 *
 * @param {express.Router} router - The Express router instance to configure.
 * @param {string} targetServiceUrl - The base URL of the target Agent Service.
 * @param {express.RequestHandler} authMiddleware - Middleware for authenticating requests.
 * @param {express.RequestHandler} creditValidationMiddleware - Middleware for credit validation.
 * @returns {express.Router} The configured router.
 */
export const configureAgentRoutes = (
  router: express.Router,
  targetServiceUrl: string,
  authMiddleware: express.RequestHandler,
  creditValidationMiddleware?: express.RequestHandler
) => {

  // Apply authentication middleware to all agent routes
  router.use(authMiddleware);

  if (creditValidationMiddleware) {
    router.use(creditValidationMiddleware);
  }

  // Create proxy for the Agent Service
  const agentProxy = createApiProxy(targetServiceUrl, 'Agent Service');

  // Specific route handling (if any) can go here
  // For example, validating specific permissions for /run vs /create

  // Apply the proxy to all paths handled by this router
  router.use(agentProxy);

  return router;
}; 