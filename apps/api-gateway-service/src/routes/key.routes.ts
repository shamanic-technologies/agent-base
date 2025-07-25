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
  authMiddleware: express.RequestHandler
) => {
  // Apply authentication middleware to all routes.
  router.use(authMiddleware);
  
  const keyProxy = createApiProxy(targetServiceUrl, 'Key Service');
  
  router.use(keyProxy);
  
  return router;
}; 