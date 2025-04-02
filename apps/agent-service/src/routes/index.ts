/**
 * Routes index
 * 
 * Central export for all route modules
 */
import { Express } from 'express';
import streamRoutes from './stream.js';
import healthRoutes from './health.js';
import agentRoutes from './agent.js';

// Configure all routes for the application
export function configureRoutes(app: Express) {
  app.use('/stream', streamRoutes);
  app.use('/health', healthRoutes);
  app.use('/agent', agentRoutes);
}

// Default export
export default {
  streamRoutes,
  healthRoutes,
  agentRoutes
}; 