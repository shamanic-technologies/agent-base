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
    logging: string;
    secret: string;
  },
  authMiddleware: express.RequestHandler
) => {

  console.log(`🟢[API Gateway Service] Configuring routes`);
  // Health check routes
  const healthRouter = express.Router();
  configureHealthRoutes(healthRouter, serviceUrls);
  app.use('/health', healthRouter);
  
  // /agent prefix
  const agentRouter = express.Router();
  console.log(`🟢[API Gateway Service /agent] Configuring agent routes`);
  configureAgentRoutes(agentRouter, serviceUrls.agent, authMiddleware);
  app.use('/agent', agentRouter);

  // // /message prefix
  // const messageRouter = express.Router();
  // configureMessageRoutes(messageRouter, serviceUrls.agent, authMiddleware);
  // app.use('/message', messageRouter);

  // // // /conversation prefix
  // const conversationRouter = express.Router();
  // configureConversationRoutes(conversationRouter, serviceUrls.agent, authMiddleware);
  // app.use('/conversation', conversationRouter);

  // // /run prefix
  // const runRouter = express.Router();
  // configureRunRoutes(runRouter, serviceUrls.agent, authMiddleware);
  // app.use('/run', runRouter);
  
  // Utility tool service routes
  const utilityToolRouter = express.Router();
  configureUtilityRoutes(utilityToolRouter, serviceUrls.utilityTool, authMiddleware);
  app.use('/utility-tool', utilityToolRouter);

  // Secret service routes
  const secretRouter = express.Router();
  configureSecretRoutes(secretRouter, serviceUrls.secret, authMiddleware);
  app.use('/secret', secretRouter);

}; 