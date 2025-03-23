/**
 * Model Service Routes
 * 
 * Routes for proxying requests to the Model Service.
 */
import express from 'express';
import axios from 'axios';
import { User } from '../types/index.js';

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
    
    try {
      // The /generate endpoint needs special handling - forward directly to MODEL_SERVICE_URL/generate
      // This ensures we're explicitly doing a POST to /generate on the Model Service
      const targetUrl = `${modelServiceUrl}/generate`;
      
      console.log(`Making POST request to model service: ${targetUrl} with body:`, 
        JSON.stringify(req.body).substring(0, 200));
      
      const headers = {
        'Content-Type': 'application/json',
        // Propagate user ID to downstream services if available
        ...(req.user && { 'x-user-id': (req.user as User).id }),
        // Include the original API key if available (for chained service calls)
        ...(req.headers['x-api-key'] && { 'x-api-key': req.headers['x-api-key'] as string })
      };
      
      const response = await axios.post(targetUrl, req.body, { 
        headers,
        timeout: 120000 // 2 minutes
      });
      
      // Return the service response
      return res.status(response.status).json(response.data);
    } catch (error) {
      console.error('Error in generate endpoint:', error);
      
      let statusCode = 500;
      let errorMessage = 'API Gateway Service: Error communicating with model service';
      let errorDetails = 'Unknown error';
      
      // Handle Axios errors with specialized error handling
      if (axios.isAxiosError(error)) {
        if (!error.response) {
          // Connection error (no response received)
          console.error(`API Gateway connection error to ${modelServiceUrl}: ${error.message}`);
          statusCode = 502; // Bad Gateway
          errorMessage = `API Gateway Service: Could not connect to model service`;
          errorDetails = error.message;
        } else {
          // Service returned an error response
          console.error(`Model service error response: ${error.response.status}`, error.response.data ? JSON.stringify(error.response.data) : 'No data');
          statusCode = error.response.status;
          errorMessage = error.response.data?.error || errorMessage;
          errorDetails = error.response.data?.details || error.message;
        }
      } else if (error instanceof Error) {
        // General JavaScript errors
        errorDetails = error.message;
      }
      
      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        details: errorDetails,
        userId: req.user ? (req.user as User).id : null
      });
    }
  });

  return router;
}; 