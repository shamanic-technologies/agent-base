/**
 * Routes Index
 * 
 * Combines and exports all routes for the API Gateway Service.
 */
import express from 'express';
import { configureHealthRoutes } from './health.routes.js';
import { configureAgentRoutes } from './agent.routes.js';
import { configureMessageRoutes } from './message.routes.js';
import { configureConversationRoutes } from './conversation.routes.js';
import { configureRunRoutes } from './run.routes.js';
import { configureUtilityRoutes } from './utility.routes.js';
import { configureSecretRoutes } from './secret.routes.js';

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
    utilityTool: string;
    key: string;
    logging?: string;
    secret?: string;
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
        utilityTool: '/utility-tool',
        secret: '/secret'
      }
    });
  });

  // Health check routes
  const healthRouter = express.Router();
  configureHealthRoutes(healthRouter, serviceUrls);
  app.use('/health', healthRouter);
  
  // --- Agent Service Prefixes --- 
  // Each prefix gets its own router and forwarding configuration

  // /agent prefix
  const agentRouter = express.Router();
  configureAgentRoutes(agentRouter, serviceUrls.agent, authMiddleware);
  app.use('/agent', agentRouter);

  // /message prefix
  const messageRouter = express.Router();
  configureMessageRoutes(messageRouter, serviceUrls.agent, authMiddleware);
  app.use('/message', messageRouter);

  // /conversation prefix
  const conversationRouter = express.Router();
  configureConversationRoutes(conversationRouter, serviceUrls.agent, authMiddleware);
  app.use('/conversation', conversationRouter);

  // /run prefix
  const runRouter = express.Router();
  configureRunRoutes(runRouter, serviceUrls.agent, authMiddleware);
  app.use('/run', runRouter);
  // --- End Agent Service Prefixes ---
  
  // Utility tool service routes
  const utilityRouter = express.Router();
  configureUtilityRoutes(utilityRouter, serviceUrls.utilityTool, authMiddleware);
  // The next line means that the routes defined in utility.routes.ts will be available at /utility-tool/*
  // So /get-list in utility.routes.ts becomes /utility-tool/get-list
  app.use('/utility-tool', utilityRouter);

  // Secret service routes
  const secretRouter = express.Router();
  const secretServiceUrl = process.env.SECRET_SERVICE_URL;
  if (secretServiceUrl) {
    configureSecretRoutes(secretRouter, secretServiceUrl, authMiddleware);
    app.use('/secret', secretRouter);
  } else {
    console.warn('SECRET_SERVICE_URL not set, secret routes will not be available');
  }
}; 