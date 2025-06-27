/**
 * Key Service Routes
 * 
 * Configures routes for proxying requests to the backend Key Service.
 */
import express from 'express';
import { createApiProxy } from '../utils/proxy.util.js';

export const configureKeyRoutes = (
  router: express.Router,
  targetServiceUrl: string,
  authMiddleware: express.RequestHandler,
  creditValidationMiddleware: express.RequestHandler
) => {
  // Apply authentication middleware to all key routes.
  router.use(authMiddleware);
  // Apply credit validation middleware
  router.use(creditValidationMiddleware);
  
  const keyProxy = createApiProxy(targetServiceUrl, 'Key Service');
  
  router.use(keyProxy);
  
  return router;
}; 