/**
 * Utility Service Routes
 * 
 * Configures routes that proxy requests to the utility service.
 */
import express from 'express';
import { forwardRequest } from '../utils/request.js';

/**
 * Configure utility service routes
 * 
 * @param router Express router
 * @param serviceUrl URL for the utility service
 * @param authMiddleware Authentication middleware
 */
export const configureUtilityRoutes = (
  router: express.Router,
  serviceUrl: string,
  authMiddleware: express.RequestHandler
) => {
  // Execute a utility
  router.post('/call-tool/:id', authMiddleware, async (req, res) => {
    const utilityId = req.params.id;
    await forwardRequest(req, res, serviceUrl, `/call-tool/${utilityId}`);
  });

  // Get details of a utility
  router.get('/get-details/:id', authMiddleware, async (req, res) => {
    const utilityId = req.params.id;
    await forwardRequest(req, res, serviceUrl, `/get-details/${utilityId}`);
  });

  // List all utilities
  router.get('/get-list', authMiddleware, async (req, res) => {
    await forwardRequest(req, res, serviceUrl, '/get-list');
  });

  return router;
}; 