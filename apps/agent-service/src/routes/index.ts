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

// Configure all routes for the application
export function configureRoutes(app: Express) {
  app.use('/agent', agentRoutes);
  app.use('/conversation', conversationRoutes);
  app.use('/run', runRoutes);
  app.use('/message', messageRoutes);
}

// Default export
export default {
  agentRoutes,
  conversationRoutes,
  runRoutes,
  messageRoutes
}; 