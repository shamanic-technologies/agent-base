/**
 * Agent Service Routes
 * 
 * Configures routes for proxying requests to the backend Agent Service.
 * It applies authentication and then uses the createApiProxy utility.
 */
import express from 'express';
import { createApiProxy } from '../utils/proxy.util.js';
import { injectCustomHeaders } from '../middlewares/header.middleware.js';

// Request type augmentation is handled globally via src/types/index.ts

/**
 * Configures routes related to agents, proxying them to the Agent Service.
 *
 * @param {express.Router} router - The Express router instance to configure.
 * @param {string} targetServiceUrl - The base URL of the target Agent Service.
 * @param {express.RequestHandler} authMiddleware - Middleware for authenticating requests.
 * @returns {express.Router} The configured router.
 */
export const configureAgentRoutes = (
  router: express.Router,
  targetServiceUrl: string,
  authMiddleware: express.RequestHandler
) => {

  // Apply authentication middleware to all agent routes.
  router.use(authMiddleware);

  // Apply the middleware to inject custom headers before proxying.
  router.use(injectCustomHeaders);

  // Create the proxy middleware instance for the Agent Service.
  const agentProxy = createApiProxy(targetServiceUrl, 'Agent Service');

  // Apply the proxy middleware. This will forward all requests matching the router's path.
  router.use(agentProxy);

  // The router is implicitly returned by Express when configured this way,
  // but returning explicitly for clarity might be preferred by some.
  return router;
}; 