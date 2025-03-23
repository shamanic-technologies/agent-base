/**
 * Utility Service Routes
 * 
 * Routes for proxying requests to the Utility Service.
 */
import express from 'express';
import { forwardRequest } from '../utils/request.js';

/**
 * Configure utility routes
 * 
 * @param router Express router
 * @param utilityServiceUrl URL of the utility service
 * @param authMiddleware Authentication middleware
 */
export const configureUtilityRoutes = (
  router: express.Router,
  utilityServiceUrl: string,
  authMiddleware: express.RequestHandler
) => {
  // POST /utility endpoint - forward to utility service
  router.post('/utility', authMiddleware, async (req: express.Request, res: express.Response) => {
    return forwardRequest(req, res, utilityServiceUrl, '/utility');
  });
  
  // GET /utilities endpoint - forward to utility service
  router.get('/utilities', authMiddleware, async (req: express.Request, res: express.Response) => {
    return forwardRequest(req, res, utilityServiceUrl, '/utilities');
  });
  
  // Catch-all for POST to /utility/* paths
  router.post('/utility/*', authMiddleware, async (req: express.Request, res: express.Response) => {
    const subPath = req.path;
    return forwardRequest(req, res, utilityServiceUrl, subPath);
  });

  return router;
}; 