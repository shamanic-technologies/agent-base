/**
 * HelloWorld API Gateway Service
 * 
 * A service that validates API keys and forwards requests to the Model Service and Utility Service.
 * This acts as a security layer between clients and the actual services.
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import fetch from 'node-fetch';
import { apiLoggerMiddleware } from './middleware/logging.middleware.js';

// Load environment variables based on NODE_ENV
const NODE_ENV = process.env.NODE_ENV || 'development';

// Only load from .env file in development
if (NODE_ENV === 'development') {
  const envFile = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envFile)) {
    console.log(`Loading environment from ${envFile}`);
    dotenv.config({ path: envFile });
  } else {
    console.log(`Environment file ${envFile} not found, using default environment variables.`);
  }
} else {
  console.log('Production environment detected, using Railway configuration.');
}

const app = express();
const PORT = process.env.PORT;
const MODEL_SERVICE_URL = process.env.MODEL_SERVICE_URL;
const UTILITY_SERVICE_URL = process.env.UTILITY_SERVICE_URL;
const KEY_SERVICE_URL = process.env.KEY_SERVICE_URL;
const LOGGING_SERVICE_URL = process.env.LOGGING_SERVICE_URL || 'http://localhost:3900';

// Middleware
app.use(cors());
app.use(express.json());

// Apply logging middleware to all routes that should be logged
app.use(apiLoggerMiddleware);

// Define interface for user information
interface User {
  id: string; // User ID is required
  email?: string;
  name?: string;
  provider?: string;
}

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
      apiKey?: string; // Added to store the extracted API key
    }
  }
}

/**
 * Validates an API key with the key service
 * Returns the validation result and user information if valid
 */
const validateApiKey = async (apiKey: string): Promise<{valid: boolean, user?: User}> => {
  try {
    console.log(`[Auth Middleware] Validating API key with Key Service`);
    const response = await axios.post(`${KEY_SERVICE_URL}/keys/validate`, { apiKey });
    
    if (response.data.success && response.data.data?.userId) {
      console.log(`[Auth Middleware] API key valid for user ${response.data.data.userId}`);
      
      // Create user object from validation response
      const user: User = {
        id: response.data.data.userId,
        email: response.data.data.email || 'unknown@example.com',
        name: response.data.data.name || 'API User',
        provider: 'api-key'
      };
      
      return {
        valid: true,
        user
      };
    }
    
    console.log(`[Auth Middleware] API key validation failed or missing userId`);
    return { valid: false };
  } catch (error) {
    console.error('[Auth Middleware] Error validating API key:', error);
    throw error; // Re-throw to be handled by caller
  }
};

/**
 * Authentication middleware that validates API keys and populates req.user
 * Also adds user headers for downstream services
 */
const authMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    // Extract API key from X-API-KEY header only
    const apiKey = req.headers['x-api-key'] as string;
    
    // Check for deprecated Authorization header usage
    if (req.headers['authorization']) {
      console.error(`[Auth Middleware] Client using deprecated Authorization header for ${req.path}`);
      return res.status(401).json({
        success: false,
        error: 'API Gateway Service: Authorization header is not supported. Please use the X-API-KEY header instead.'
      });
    }
    
    if (!apiKey) {
      console.log(`[Auth Middleware] No API key provided for ${req.path}`);
      return res.status(401).json({
        success: false,
        error: 'API Gateway Service: API key is required. Please use the X-API-KEY header.'
      });
    }
    
    // Store the API key in the request for downstream handlers
    req.apiKey = apiKey;
    
    // Validate the API key and get user information
    const validation = await validateApiKey(apiKey);
    
    if (!validation.valid || !validation.user) {
      console.log(`[Auth Middleware] Invalid API key for ${req.path}`);
      return res.status(401).json({
        success: false,
        error: 'API Gateway Service: Invalid API key'
      });
    }
    
    // Set user object on request
    req.user = validation.user;
    
    // Add user headers for downstream services
    req.headers['x-user-id'] = validation.user.id;
    if (validation.user.email) req.headers['x-user-email'] = validation.user.email;
    if (validation.user.name) req.headers['x-user-name'] = validation.user.name;
    if (validation.user.provider) req.headers['x-user-provider'] = validation.user.provider;
    
    console.log(`[Auth Middleware] Authenticated user ${validation.user.id} for ${req.path}`);
    next();
  } catch (error) {
    console.error(`[Auth Middleware] Error processing API key:`, error);
    return res.status(500).json({
      success: false,
      error: 'API Gateway Service: Authentication error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Forwards a request to a service
 * Passes user information via headers instead of in the request body
 */
const forwardRequest = async (req: express.Request, res: express.Response, serviceUrl: string) => {
  // Build target URL by joining service URL with the request path
  const targetUrl = `${serviceUrl}${req.path}`;
  
  // Create the request configuration
  const headers = {
    'Content-Type': 'application/json',
    // Propagate user ID to downstream services if available
    ...(req.user && { 'x-user-id': req.user.id }),
    // Include the original API key if available (for chained service calls)
    ...(req.headers['x-api-key'] && { 'x-api-key': req.headers['x-api-key'] as string })
  };
  
  try {
    console.log(`Forwarding ${req.method} request to: ${targetUrl}`);
    
    let response;
    
    // Use explicit method calls based on the request method
    switch (req.method) {
      case 'POST':
        console.log(`Making POST request to ${targetUrl} with body:`, JSON.stringify(req.body).substring(0, 200));
        response = await axios.post(targetUrl, req.body, { 
          headers,
          timeout: 120000 // 2 minutes
        });
        break;
        
      case 'GET':
        console.log(`Making GET request to ${targetUrl}`);
        response = await axios.get(targetUrl, { 
          headers,
          params: req.query,
          timeout: 120000 // 2 minutes
        });
        break;
        
      case 'PUT':
        response = await axios.put(targetUrl, req.body, { 
          headers,
          timeout: 120000 // 2 minutes
        });
        break;
        
      case 'DELETE':
        response = await axios.delete(targetUrl, { 
          headers,
          timeout: 120000 // 2 minutes
        });
        break;
        
      default:
        // Fallback to the generic method for other HTTP methods
        response = await axios({
          method: req.method,
          url: targetUrl,
          headers,
          data: req.body,
          timeout: 120000 // 2 minutes
        });
    }
    
    // Return the service response
    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error(`Error forwarding request to ${targetUrl}:`, error);
    
    let statusCode = 500;
    let errorMessage = 'API Gateway Service: Error communicating with service';
    let errorDetails = 'Unknown error';
    
    // Handle Axios errors with specialized error handling
    if (axios.isAxiosError(error)) {
      if (!error.response) {
        // Connection error (no response received)
        console.error(`API Gateway connection error to ${serviceUrl}: ${error.message}`);
        statusCode = 502; // Bad Gateway
        errorMessage = `API Gateway Service: Could not connect to ${serviceUrl.split('/').slice(-1)[0] || 'service'}`;
        errorDetails = error.message;
      } else {
        // Service returned an error response
        console.error(`Service error response from ${serviceUrl}: ${error.response.status} ${JSON.stringify(error.response.data)}`);
        statusCode = error.response.status;
        errorMessage = error.response.data?.error || errorMessage;
        errorDetails = error.response.data?.details || error.message;
      }
    } else if (error instanceof Error) {
      // General JavaScript errors
      errorDetails = error.message;
      
      // Handle timeout errors specifically
      if (error.message.includes('timeout')) {
        statusCode = 504; // Gateway Timeout
        errorMessage = 'API Gateway Service: Request timed out';
        errorDetails = `Request to ${serviceUrl.split('/').slice(-1)[0] || 'service'} timed out after 120 seconds`;
      }
    }
    
    // Return structured error response
    return res.status(statusCode).json({
      status: statusCode,
      success: false,
      error: errorMessage,
      details: errorDetails,
      userId: req.user?.id || null
    });
  }
};

/**
 * Health check endpoint
 * Returns the status of the API gateway service and its connections
 */
app.get('/health', (req: express.Request, res: express.Response) => {
  res.status(200).json({
    status: 'healthy',
    services: {
      model: MODEL_SERVICE_URL,
      utility: UTILITY_SERVICE_URL,
      key: KEY_SERVICE_URL
    }
  });
});

/**
 * Generate endpoint
 * Validates API key and forwards request to model service
 * Requires API key and conversation_id
 */
app.post('/generate', authMiddleware, async (req: express.Request, res: express.Response) => {
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
    const targetUrl = `${MODEL_SERVICE_URL}/generate`;
    
    console.log(`Making POST request to model service: ${targetUrl} with body:`, 
      JSON.stringify(req.body).substring(0, 200));
    
    const headers = {
      'Content-Type': 'application/json',
      // Propagate user ID to downstream services if available
      ...(req.user && { 'x-user-id': req.user.id }),
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
        console.error(`API Gateway connection error to ${MODEL_SERVICE_URL}: ${error.message}`);
        statusCode = 502; // Bad Gateway
        errorMessage = `API Gateway Service: Could not connect to model service`;
        errorDetails = error.message;
      } else {
        // Service returned an error response
        console.error(`Model service error response: ${error.response.status} ${JSON.stringify(error.response.data)}`);
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
      userId: req.user?.id || null
    });
  }
});

/**
 * Utility service endpoints
 * All endpoints require API key validation
 */
app.use('/utility', authMiddleware);

/**
 * Forward POST request to utility service
 * Specific route for executing utilities must come before catch-all route
 */
app.post('/utility/utility', async (req: express.Request, res: express.Response) => {
  try {
    // Special case for executing utilities
    const targetUrl = `${UTILITY_SERVICE_URL}/utility`;
    
    console.log(`Making POST request to utility service: ${targetUrl}`);
    console.log(`Request body: ${JSON.stringify(req.body).substring(0, 200)}`);
    console.log(`Request headers: x-user-id: ${req.user?.id || 'not set'}`);
    
    const headers = {
      'Content-Type': 'application/json',
      // Propagate user ID to downstream services if available
      ...(req.user && { 'x-user-id': req.user.id })
    };
    
    console.log(`Headers being sent: ${JSON.stringify(headers)}`);
    
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
      console.error(`Response data: ${JSON.stringify(error.response?.data || 'No data')}`);
      console.error(`Request URL: ${error.config?.url || 'No URL'}`);
      console.error(`Request method: ${error.config?.method || 'No method'}`);
      console.error(`Request headers: ${JSON.stringify(error.config?.headers || 'No headers')}`);
      console.error(`Request data: ${JSON.stringify(error.config?.data || 'No data')}`);
    }
    
    let statusCode = 500;
    let errorMessage = 'API Gateway Service: Error communicating with utility service';
    let errorDetails = 'Unknown error';
    
    // Handle Axios errors with specialized error handling
    if (axios.isAxiosError(error)) {
      if (!error.response) {
        // Connection error (no response received)
        console.error(`API Gateway connection error to ${UTILITY_SERVICE_URL}: ${error.message}`);
        statusCode = 502; // Bad Gateway
        errorMessage = `API Gateway Service: Could not connect to utility service`;
        errorDetails = error.message;
      } else {
        // Service returned an error response
        console.error(`Utility service error response: ${error.response.status} ${JSON.stringify(error.response.data)}`);
        statusCode = error.response.status;
        errorMessage = error.response.data?.error || errorMessage;
        errorDetails = error.response.data?.details || error.message;
      }
    } else if (error instanceof Error) {
      // General JavaScript errors
      errorDetails = error.message;
    }
    
    return res.status(statusCode).json({
      status: statusCode,
      success: false,
      error: errorMessage,
      details: errorDetails,
      userId: req.user?.id || null
    });
  }
});

// Forward POST requests to utility service for other paths
app.post('/utility/*', async (req: express.Request, res: express.Response) => {
  try {
    // Extract the path after /utility to forward to the utility service
    const utilityPath = req.path.replace('/utility', '');
    
    // Forward the request to the utility service
    await forwardRequest(req, res, UTILITY_SERVICE_URL);
  } catch (error) {
    console.error('Error in utility endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'API Gateway Service: Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Forward GET requests to utility service
app.get('/utility/utilities', async (req: express.Request, res: express.Response) => {
  try {
    // Special case for /utilities endpoint, we need to forward to /utilities on the Utility Service
    const targetUrl = `${UTILITY_SERVICE_URL}/utilities`;
    
    console.log(`Making GET request to utility service: ${targetUrl}`);
    
    const headers = {
      'Content-Type': 'application/json',
      // Propagate user ID to downstream services if available
      ...(req.user && { 'x-user-id': req.user.id }),
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
        console.error(`API Gateway connection error to ${UTILITY_SERVICE_URL}: ${error.message}`);
        statusCode = 502; // Bad Gateway
        errorMessage = `API Gateway Service: Could not connect to utility service`;
        errorDetails = error.message;
      } else {
        // Service returned an error response
        console.error(`Utility service error response: ${error.response.status} ${JSON.stringify(error.response.data)}`);
        statusCode = error.response.status;
        errorMessage = error.response.data?.error || errorMessage;
        errorDetails = error.response.data?.details || error.message;
      }
    } else if (error instanceof Error) {
      // General JavaScript errors
      errorDetails = error.message;
    }
    
    return res.status(statusCode).json({
      status: statusCode,
      success: false,
      error: errorMessage,
      details: errorDetails,
      userId: req.user?.id || null
    });
  }
});

// Forward GET requests for specific utility info
app.get('/utility/utility/:id', async (req: express.Request, res: express.Response) => {
  try {
    // Special case for getting utility info
    const utilityId = req.params.id;
    const targetUrl = `${UTILITY_SERVICE_URL}/utility/${utilityId}`;
    
    console.log(`Making GET request to utility service: ${targetUrl}`);
    
    const headers = {
      'Content-Type': 'application/json',
      // Propagate user ID to downstream services if available
      ...(req.user && { 'x-user-id': req.user.id }),
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
    console.error('Error processing utility info request:', error);
    
    let statusCode = 500;
    let errorMessage = 'API Gateway Service: Error communicating with utility service';
    let errorDetails = 'Unknown error';
    
    // Handle Axios errors with specialized error handling
    if (axios.isAxiosError(error)) {
      if (!error.response) {
        // Connection error (no response received)
        console.error(`API Gateway connection error to ${UTILITY_SERVICE_URL}: ${error.message}`);
        statusCode = 502; // Bad Gateway
        errorMessage = `API Gateway Service: Could not connect to utility service`;
        errorDetails = error.message;
      } else {
        // Service returned an error response
        console.error(`Utility service error response: ${error.response.status} ${JSON.stringify(error.response.data)}`);
        statusCode = error.response.status;
        errorMessage = error.response.data?.error || errorMessage;
        errorDetails = error.response.data?.details || error.message;
      }
    } else if (error instanceof Error) {
      // General JavaScript errors
      errorDetails = error.message;
    }
    
    return res.status(statusCode).json({
      status: statusCode,
      success: false,
      error: errorMessage,
      details: errorDetails,
      userId: req.user?.id || null
    });
  }
});

// Forward GET requests for other utility paths
app.get('/utility/*', async (req: express.Request, res: express.Response) => {
  try {
    // Extract the path after /utility to forward to the utility service
    const utilityPath = req.path.replace('/utility', '');
    
    // Forward the request to the utility service
    await forwardRequest(req, res, UTILITY_SERVICE_URL);
  } catch (error) {
    console.error('Error processing utility request:', error);
    return res.status(500).json({
      success: false,
      error: 'API Gateway Service: Internal server error'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🔐 API Gateway Service running on port ${PORT}`);
  console.log(`🔄 Forwarding model requests to ${MODEL_SERVICE_URL}`);
  console.log(`🔄 Forwarding utility requests to ${UTILITY_SERVICE_URL}`);
  console.log(`🔑 Using Key Service at ${KEY_SERVICE_URL}`);
});