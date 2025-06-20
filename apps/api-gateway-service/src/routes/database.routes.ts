/**
 * Database Service Routes
 * 
 * Configures routes for proxying requests to the backend Database Service.
 * This file now follows the simpler pattern from agent.routes.ts.
 */
import express from 'express';
import { createApiProxy } from '../utils/proxy.util.js';

/**
 * Configures routes related to the database, proxying them to the Database Service.
 *
 * @param {express.Router} router - The Express router instance to configure.
 * @param {string} targetServiceUrl - The base URL of the target Database Service.
 * @param {express.RequestHandler} authMiddleware - Middleware for authenticating requests.
 */
export const configureDatabaseRoutes = (
  router: express.Router,
  targetServiceUrl: string,
  authMiddleware: express.RequestHandler
) => {

  // Apply authentication middleware to all database routes.
  router.use(authMiddleware);

  // Create the proxy middleware instance for the Database Service.
  const databaseProxy = createApiProxy(targetServiceUrl, 'Database Service');

  // Apply the proxy middleware.
  // Because this router is mounted on '/database', a request to the gateway at
  // '/database/dashboards' will result in req.path being '/dashboards' here.
  // The proxy will then correctly forward the request to 'targetServiceUrl/dashboards'.
  router.use(databaseProxy);

  return router;
}; 