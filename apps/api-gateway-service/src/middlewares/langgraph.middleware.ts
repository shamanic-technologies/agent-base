/**
 * LangGraph Middleware
 * 
 * This middleware is designed to run after the main authentication middleware.
 * It takes the validated user and credential information that the auth middleware
 * attaches to the request headers (e.g., x-platform-user-id) and injects them
 * into the `configurable` object within the request body.
 * 
 * This is necessary because the LangGraph service and its underlying SDK expect
 * these credentials to be present in the body for each request in a stream,
 * rather than just in the headers of the initial request.
 */
import express from 'express';

export const langgraphMiddleware = () => {
  return async (req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> => {
    try {
      // These headers are expected to be validated and attached by the preceding auth.middleware
      const platformUserId = req.headers['x-platform-user-id'] as string;
      const clientUserId = req.headers['x-client-user-id'] as string;
      const clientOrganizationId = req.headers['x-client-organization-id'] as string;
      const platformApiKey = req.headers['x-platform-api-key'] as string;

      // The langgraphjs SDK sends an empty body on some requests (e.g., GET requests within the stream).
      // We need to ensure the body is a valid object.
      if (typeof req.body !== 'object' || req.body === null) {
        req.body = {};
      }

      // Ensure the 'configurable' object exists on the body
      if (!req.body.configurable) {
        req.body.configurable = {};
      }

      // Inject the credentials from headers into the body's configurable object
      req.body.configurable.platformUserId = platformUserId;
      req.body.configurable.clientUserId = clientUserId;
      req.body.configurable.clientOrganizationId = clientOrganizationId;
      req.body.configurable.platformApiKey = platformApiKey;
      
      // Pass control to the next handler (the proxy)
      next();
    } catch (error) {
      console.error(`[LangGraph Middleware] Unexpected error:`, error);
      res.status(500).json({
        success: false,
        error: 'API Gateway Service: Internal error in LangGraph middleware',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
      return;
    }
  };
};
