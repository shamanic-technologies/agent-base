/**
 * Utility Service Routes
 * 
 * Routes for proxying requests to the Utility Service.
 */
import express from 'express';
import axios from 'axios';
import { forwardRequest } from '../utils/request.js';
import { User } from '../types/index.js';

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
  // Apply authentication to all utility routes
  router.use(authMiddleware);

  /**
   * Forward POST request to utility service
   * Specific route for executing utilities must come before catch-all route
   */
  router.post('/utility', async (req: express.Request, res: express.Response) => {
    try {
      // Special case for executing utilities
      const targetUrl = `${utilityServiceUrl}/utility`;
      
      console.log(`Making POST request to utility service: ${targetUrl}`);
      console.log(`Request body:`, JSON.stringify(req.body).substring(0, 200));
      console.log(`Request headers: x-user-id: ${req.user ? (req.user as User).id : 'not set'}`);
      
      const headers = {
        'Content-Type': 'application/json',
        // Propagate user ID to downstream services if available
        ...(req.user && { 'x-user-id': (req.user as User).id }),
        // Include the original API key if available (for chained service calls)
        ...(req.headers['x-api-key'] && { 'x-api-key': req.headers['x-api-key'] as string })
      };
      
      console.log(`Headers being sent:`, JSON.stringify(headers).substring(0, 200));
      
      const response = await axios.post(targetUrl, req.body, { 
        headers,
        timeout: 120000 // 2 minutes
      });
      
      // Return the service response
      return res.status(response.status).json(response.data);
    } catch (error) {
      console.error('Error executing utility:', error);
      
      if (axios.isAxiosError(error)) {
        console.error(`Response status: ${error.response?.status || 'No response'}`);
        console.error(`Response data:`, error.response?.data ? JSON.stringify(error.response.data) : 'No data');
        console.error(`Request URL: ${error.config?.url || 'No URL'}`);
        console.error(`Request method: ${error.config?.method || 'No method'}`);
        console.error(`Request headers:`, error.config?.headers ? JSON.stringify(error.config.headers) : 'No headers');
        console.error(`Request data:`, error.config?.data ? JSON.stringify(error.config.data) : 'No data');
      }
      
      let statusCode = 500;
      let errorMessage = 'API Gateway Service: Error communicating with utility service';
      let errorDetails = 'Unknown error';
      
      // Handle Axios errors with specialized error handling
      if (axios.isAxiosError(error)) {
        if (!error.response) {
          // Connection error (no response received)
          console.error(`API Gateway connection error to ${utilityServiceUrl}: ${error.message || 'No error message'}`);
          statusCode = 502; // Bad Gateway
          errorMessage = `API Gateway Service: Could not connect to utility service`;
          errorDetails = error.message || 'No error message';
        } else {
          // Service returned an error response
          console.error(`Utility service error response: ${error.response.status}`, error.response.data ? JSON.stringify(error.response.data) : 'No data');
          statusCode = error.response.status || 500;
          errorMessage = error.response.data?.error || errorMessage;
          errorDetails = error.response.data?.details || error.message || 'No details';
        }
      } else if (error instanceof Error) {
        // General JavaScript errors
        errorDetails = error.message || 'No error message';
      }
      
      return res.status(statusCode).json({
        status: statusCode,
        success: false,
        error: errorMessage,
        details: errorDetails,
        userId: req.user ? (req.user as User).id : null
      });
    }
  });

  // Forward GET requests to utility service - /utilities
  router.get('/utilities', async (req: express.Request, res: express.Response) => {
    try {
      // Special case for /utilities endpoint, we need to forward to /utilities on the Utility Service
      const targetUrl = `${utilityServiceUrl}/utilities`;
      
      console.log(`Making GET request to utility service: ${targetUrl}`);
      
      const headers = {
        'Content-Type': 'application/json',
        // Propagate user ID to downstream services if available
        ...(req.user && { 'x-user-id': (req.user as User).id }),
        // Include the original API key if available (for chained service calls)
        ...(req.headers['x-api-key'] && { 'x-api-key': req.headers['x-api-key'] as string })
      };
      
      const response = await axios.get(targetUrl, { 
        headers,
        params: req.query,
        timeout: 120000 // 2 minutes
      });
      
      // Return the service response
      return res.status(response.status).json(response.data);
    } catch (error) {
      console.error('Error processing utility request:', error);
      
      let statusCode = 500;
      let errorMessage = 'API Gateway Service: Error communicating with utility service';
      let errorDetails = 'Unknown error';
      
      // Handle Axios errors with specialized error handling
      if (axios.isAxiosError(error)) {
        if (!error.response) {
          // Connection error (no response received)
          console.error(`API Gateway connection error to ${utilityServiceUrl}: ${error.message || 'No error message'}`);
          statusCode = 502; // Bad Gateway
          errorMessage = `API Gateway Service: Could not connect to utility service`;
          errorDetails = error.message || 'No error message';
        } else {
          // Service returned an error response
          console.error(`Utility service error response: ${error.response.status}`, error.response.data ? JSON.stringify(error.response.data) : 'No data');
          statusCode = error.response.status || 500;
          errorMessage = error.response.data?.error || errorMessage;
          errorDetails = error.response.data?.details || error.message || 'No details';
        }
      } else if (error instanceof Error) {
        // General JavaScript errors
        errorDetails = error.message || 'No error message';
      }
      
      return res.status(statusCode).json({
        status: statusCode,
        success: false,
        error: errorMessage,
        details: errorDetails,
        userId: req.user ? (req.user as User).id : null
      });
    }
  });

  // Forward POST requests to utility service for other paths
  router.post('/*', async (req: express.Request, res: express.Response) => {
    try {
      // Extract the path after /utility to forward to the utility service
      const utilityPath = req.path.replace('/utility', '');
      
      // Forward the request to the utility service
      await forwardRequest(req, res, utilityServiceUrl);
    } catch (error) {
      console.error('Error in utility endpoint:', error);
      res.status(500).json({
        success: false,
        error: 'API Gateway Service: Server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}; 