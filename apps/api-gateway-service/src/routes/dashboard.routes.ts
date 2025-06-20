/**
 * Dashboard Service Routes
 * 
 * Configures routes for proxying requests to the backend Dashboard Service.
 */
import express from 'express';
import { createApiProxy } from '../utils/proxy.util.js';

/**
 * Configures routes related to the dashboard service.
 *
 * @param {express.Router} router - The Express router instance to configure.
 * @param {string} targetServiceUrl - The base URL of the target Dashboard Service.
 * @param {express.RequestHandler} authMiddleware - Middleware for authenticating requests.
 */
export const configureDashboardRoutes = (
  router: express.Router,
  targetServiceUrl: string,
  authMiddleware: express.RequestHandler
) => {

  // Apply authentication middleware to all routes.
  router.use(authMiddleware);

  // Create the proxy middleware instance for the Dashboard Service.
  const dashboardProxy = createApiProxy(targetServiceUrl, 'Dashboard Service');
  
  // Apply the proxy middleware.
  router.use(dashboardProxy);

  return router;
}; 