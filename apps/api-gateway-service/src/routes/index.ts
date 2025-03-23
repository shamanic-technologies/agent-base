/**
 * Routes Index
 * 
 * Combines and exports all routes for the API Gateway Service.
 */
import express from 'express';
import { configureHealthRoutes } from './health.routes.js';
import { configureModelRoutes } from './model.routes.js';
import { configureUtilityRoutes } from './utility.routes.js';

/**
 * Configure all routes for the API Gateway
 * 
 * @param app Express application
 * @param serviceUrls URLs for all dependent services
 * @param authMiddleware Authentication middleware
 */
export const configureRoutes = (
  app: express.Express,
  serviceUrls: {
    model: string;
    utility: string;
    key: string;
    logging?: string;
  },
  authMiddleware: express.RequestHandler
) => {
  // Health check routes
  const healthRouter = express.Router();
  configureHealthRoutes(healthRouter, serviceUrls);
  app.use('/health', healthRouter);
  
  // Model service routes
  const modelRouter = express.Router();
  configureModelRoutes(modelRouter, serviceUrls.model, authMiddleware);
  app.use('/', modelRouter);
  
  // Utility service routes
  const utilityRouter = express.Router();
  configureUtilityRoutes(utilityRouter, serviceUrls.utility, authMiddleware);
  app.use('/utility', utilityRouter);
}; 