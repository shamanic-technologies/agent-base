/**
 * Model Service Routes
 * 
 * Routes for proxying requests to the Model Service.
 */
import express from 'express';
import axios from 'axios';
import { User } from '../types/index.js';
import { forwardRequest } from '../utils/request.js';

/**
 * Configure model routes
 * 
 * @param router Express router
 * @param modelServiceUrl URL of the model service
 * @param authMiddleware Authentication middleware
 */
export const configureModelRoutes = (
  router: express.Router,
  modelServiceUrl: string,
  authMiddleware: express.RequestHandler
) => {
  /**
   * Generate endpoint
   * Validates API key and forwards request to model service
   * Requires API key and conversation_id
   */
  router.post('/generate', authMiddleware, async (req: express.Request, res: express.Response) => {
    const { conversation_id } = req.body;
    
    // Check if conversation_id is provided
    if (!conversation_id) {
      return res.status(400).json({
        success: false,
        error: 'API Gateway Service: conversation_id is required'
      });
    }
    
    // Forward the request to the model service
    return forwardRequest(req, res, modelServiceUrl, '/generate');
  });

  return router;
}; 