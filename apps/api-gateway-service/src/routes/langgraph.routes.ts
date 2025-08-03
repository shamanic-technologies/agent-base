/**
 * LangGraph Agent Routes
 * 
 * This file configures a proxy to the LangGraph agent service.
 * It applies a specific middleware chain to handle authentication and
 * inject credentials into the request body before forwarding.
 */
import express from 'express';
import { createApiProxy } from '../utils/proxy.util.js';
import { langgraphMiddleware } from '../middlewares/langgraph.middleware.js'; // Import the new middleware

export const configureLangGraphRoutes = (
  router: express.Router,
  langGraphServiceUrl: string,
  authMiddleware: express.RequestHandler
) => {

  // This is the correct place for the middleware chain.
  // 1. First, the main auth middleware runs to validate the user.
  // 2. Then, our special langgraph middleware runs to modify the body.
  // 3. Finally, the request is proxied.
  router.use(
    express.json({ limit: '50mb' }), // Parse JSON bodies
    authMiddleware, 
    langgraphMiddleware()
  );

  // Create the proxy middleware instance for the LangGraph Service.
  const langGraphProxy = createApiProxy(langGraphServiceUrl, 'LangGraph Service');
  
  // Apply the proxy middleware after the others have run.
  router.use(langGraphProxy);

  return router;
};
