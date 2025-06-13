import express from 'express';
import { createApiProxy } from '../utils/proxy.util.js';

/**
 * Configures routes for the Tool Auth Service.
 *
 * @param {express.Router} router - The Express router instance to configure.
 * @param {string} targetServiceUrl - The base URL of the target Tool Auth Service.
 * @param {express.RequestHandler} authMiddleware - Middleware for authenticating requests.
 * @returns {express.Router} The configured router.
 */
export const configureToolAuthRoutes = (
  router: express.Router,
  targetServiceUrl: string,
  authMiddleware: express.RequestHandler
) => {
  // Apply authentication middleware to all tool-auth routes.
  router.use(authMiddleware);

  const toolAuthProxy = createApiProxy(targetServiceUrl, 'Tool Auth Service');
  router.use(toolAuthProxy);
  
  return router;
}; 