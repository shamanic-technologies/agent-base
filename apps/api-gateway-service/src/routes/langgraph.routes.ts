/**
 * LangGraph Agent Routes
 * 
 * This file configures a proxy to the LangGraph agent service.
 */
import express from 'express';
import { createApiProxy } from '../utils/proxy.util.js';

export const configureLangGraphRoutes = (
  router: express.Router,
  langGraphServiceUrl: string,
  authMiddleware: express.RequestHandler
) => {

  // Apply auth middleware to all routes in this router
  router.use(authMiddleware);

  // Create the proxy middleware instance for the LangGraph Service.
  const langGraphProxy = createApiProxy(langGraphServiceUrl, 'LangGraph Service');
  
  // Apply the proxy middleware.
  router.use(langGraphProxy);

  return router;
};
