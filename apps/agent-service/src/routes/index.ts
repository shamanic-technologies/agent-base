/**
 * Routes index
 * 
 * Central export for all route modules
 */
import { Express } from 'express';
import agentRoutes from './agent.js';
import conversationRoutes from './conversation.js';
import runRoutes from './run.js';
import messageRoutes from './message.js';
import healthRoutes from './health.js';
import actionsRoutes from './actions.js';
import langgraphRoutes from './langgraph.js';

// Configure all routes for the application
export function configureRoutes(app: Express) {
  app.use('/health', healthRoutes);
  app.use('/conversation', conversationRoutes);
  app.use('/run', runRoutes);
  app.use('/', langgraphRoutes);
  app.use('/message', messageRoutes);
  app.use('/actions', actionsRoutes);
  app.use('/', agentRoutes);
}

// Default export
export default {
  agentRoutes,
  conversationRoutes,
  runRoutes,
  messageRoutes,
  healthRoutes,
  actionsRoutes,
  langgraphRoutes,
}; 