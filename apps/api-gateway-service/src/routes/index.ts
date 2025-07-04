/**
 * Routes Index
 * 
 * Combines and exports all routes for the API Gateway Service.
 */
import express from 'express';
import { configureHealthRoutes } from './health.routes.js';
import { configureAgentRoutes } from './agent.routes.js';
import { configureUtilityRoutes } from './utility.routes.js';
import { configureSecretRoutes } from './secret.routes.js';
import { configurePaymentRoutes } from './payment.routes.js';
// Import webhook routes config
import { configureWebhookRoutes } from './webhook.routes.js';
import { configureApiToolRoutes } from './api-tool.routes.js';
import { configureToolAuthRoutes } from './tool-auth.routes.js';
import { configureUserRoutes } from './user.routes.js';
import { configureDatabaseRoutes } from './database.routes.js';
import { configureDashboardRoutes } from './dashboard.routes.js';
import { configureKeyRoutes } from './key.routes.js';

/**
 * Configure all routes for the API Gateway
 * 
 * @param app Express application
 * @param serviceUrls URLs for all dependent services
 * @param authMiddleware Authentication middleware
 * @param creditValidationMiddleware Credit validation middleware
 */
export const configureRoutes = (
  app: express.Express,
  serviceUrls: {
    agent: string;
    utilityTool: string;
    key: string;
    secret: string;
    webhookTool: string;
    apiTool: string;
    toolAuth: string;
    user: string;
    database: string;
    dashboard: string;
    payment: string;
  },
  authMiddleware: express.RequestHandler,
  creditValidationMiddleware: express.RequestHandler
) => {

  // Health check routes
  const healthRouter = express.Router();
  configureHealthRoutes(healthRouter, serviceUrls);
  app.use('/health', healthRouter);
  
  // /agent prefix
  const agentRouter = express.Router();
  configureAgentRoutes(agentRouter, serviceUrls.agent, authMiddleware, creditValidationMiddleware);
  app.use('/agent', agentRouter);

  // Payment service routes
  const paymentRouter = express.Router();
  configurePaymentRoutes(paymentRouter, serviceUrls.payment, authMiddleware);
  app.use('/payment', paymentRouter);

  
  // Utility tool service routes
  const utilityToolRouter = express.Router();
  configureUtilityRoutes(utilityToolRouter, serviceUrls.utilityTool, authMiddleware, creditValidationMiddleware);
  app.use('/utility-tool', utilityToolRouter);

  // Secret service routes
  const secretRouter = express.Router();
  configureSecretRoutes(secretRouter, serviceUrls.secret, authMiddleware);
  app.use('/secret', secretRouter);

  // Webhook service routes
  const webhookRouter = express.Router();
  // Pass the renamed key from serviceUrls
  configureWebhookRoutes(webhookRouter, serviceUrls.webhookTool, authMiddleware, creditValidationMiddleware);
  app.use('/webhook', webhookRouter);

  // API tool service routes
  const apiToolRouter = express.Router();
  configureApiToolRoutes(apiToolRouter, serviceUrls.apiTool, authMiddleware, creditValidationMiddleware);
  app.use('/api-tool', apiToolRouter);

  // Tool auth service routes
  const toolAuthRouter = express.Router();
  configureToolAuthRoutes(toolAuthRouter, serviceUrls.toolAuth, authMiddleware);
  app.use('/tool-auth', toolAuthRouter);

  // User service routes
  const userRouter = express.Router();
  configureUserRoutes(userRouter, serviceUrls.user, authMiddleware);
  app.use('/user', userRouter);

  // Database service routes
  const databaseRouter = express.Router();
  configureDatabaseRoutes(databaseRouter, serviceUrls.database, authMiddleware);
  app.use('/database', databaseRouter);

  // Dashboard service routes
  const dashboardRouter = express.Router();
  configureDashboardRoutes(dashboardRouter, serviceUrls.dashboard, authMiddleware);
  app.use('/dashboard', dashboardRouter);

  // Key service routes
  const keyRouter = express.Router();
  configureKeyRoutes(keyRouter, serviceUrls.key, authMiddleware);
  app.use('/key', keyRouter);

}; 