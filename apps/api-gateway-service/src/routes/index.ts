/**
 * Routes Index
 * 
 * Combines and exports all routes for the API Gateway Service.
 */
import express from 'express';
import { configureHealthRoutes } from './health.routes.js';
import { configureAgentRoutes } from './agent.routes.js';
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
    agent: string;
    utility: string;
    key: string;
    logging?: string;
  },
  authMiddleware: express.RequestHandler
) => {
  // Debug route to confirm API Gateway is working
  app.get('/debug', (req, res) => {
    res.status(200).json({
      message: 'API Gateway is working',
      routes: {
        health: '/health',
        agent: '/agent',
        utility: '/utility-tool'
      }
    });
  });

  // Health check routes
  const healthRouter = express.Router();
  configureHealthRoutes(healthRouter, serviceUrls);
  app.use('/health', healthRouter);
  
  // Agent service routes
  const agentRouter = express.Router();
  configureAgentRoutes(agentRouter, serviceUrls.agent, authMiddleware);
  app.use('/agent', agentRouter);
  
  // Utility tool service routes
  const utilityRouter = express.Router();
  configureUtilityRoutes(utilityRouter, serviceUrls.utility, authMiddleware);
  // The next line means that the routes defined in utility.routes.ts will be available at /utility-tool/*
  // So /get-list in utility.routes.ts becomes /utility-tool/get-list
  app.use('/utility-tool', utilityRouter);
}; 