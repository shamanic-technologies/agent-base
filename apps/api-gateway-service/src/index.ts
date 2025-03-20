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
import { apiLoggerMiddleware } from './middleware/logging.middleware';

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

/**
 * Validates an API key with the key service
 * Returns the validation result and user ID if valid
 * Throws an error if user ID is missing
 */
const validateApiKey = async (apiKey: string): Promise<{valid: boolean, userId: string}> => {
  try {
    const response = await axios.post(`${KEY_SERVICE_URL}/keys/validate`, { apiKey });
    
    if (response.data.success && response.data.data.userId) {
      return {
        valid: true,
        userId: response.data.data.userId
      };
    }
    
    if (response.data.success && !response.data.data.userId) {
      throw new Error('API Gateway Service: Missing userId in validation response');
    }
    
    return { valid: false, userId: '' }; // Will never use the userId if not valid
  } catch (error) {
    console.error('API Gateway Service: Error validating API key:', error);
    throw error; // Re-throw to be handled by caller
  }
};

/**
 * Forwards a request to a service
 * Enriches the request body with user_id and passes API key via headers
 * Handles error responses and formatting
 */
const forwardRequest = async (
  serviceUrl: string, 
  endpoint: string, 
  requestData: any, 
  userId: string,
  authHeader: string
): Promise<{status: number, data: any}> => {
  try {
    // Determine if we're dealing with query params or body data
    const isQueryParams = typeof requestData === 'object' && 'user_id' in requestData;
    
    // Create headers with Bearer token
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    };
    
    // Handle different HTTP methods appropriately
    let response;
    
    if (endpoint.startsWith('/utilities') && isQueryParams) {
      // For GET requests to /utilities endpoint
      response = await axios.get(`${serviceUrl}${endpoint}`, {
        params: {
          ...requestData,
          user_id: userId // Always include user_id in the params
        },
        headers
      });
    } else {
      // For POST and other requests
      // Create an enriched request body with the user ID
      const enrichedRequestData = {
        ...requestData,
        user_id: userId  // Always include user_id in the forwarded request
      };
      
      console.log(`Forwarding request to ${serviceUrl}${endpoint} for user ID: ${userId}`);
      
      // Forward the enriched request to the service
      response = await axios.post(`${serviceUrl}${endpoint}`, enrichedRequestData, { headers });
    }
    
    // Add user ID tracking info (in case it's not already included in response)
    if (response.data && typeof response.data === 'object') {
      response.data.user_id = userId;
    }
    
    return { status: 200, data: response.data };
  } catch (error) {
    console.error(`Error forwarding request to ${serviceUrl}${endpoint}:`, error);
    
    // Check if it's a connection error
    if (axios.isAxiosError(error) && !error.response) {
      return { 
        status: 502, 
        data: { 
          success: false,
          error: `API Gateway Service: Could not connect to service at ${serviceUrl}`,
          user_id: userId  // Include user_id even in error responses
        }
      };
    }
    
    // Forward the status code from the service
    const status = axios.isAxiosError(error) ? error.response?.status || 500 : 500;
    
    return { 
      status, 
      data: { 
        success: false,
        error: `API Gateway Service: Error communicating with service`,
        details: axios.isAxiosError(error) 
          ? error.response?.data || error.message 
          : error instanceof Error ? error.message : 'Unknown error',
        user_id: userId  // Include user_id even in error responses
      }
    };
  }
};

/**
 * Creates a request handler with common validations and forwarding logic
 */
const createRequestHandler = (
  serviceUrl: string,
  endpoint: string,
  requireConversationId: boolean = true
) => {
  return async (req: express.Request, res: express.Response) => {
    // Extract API key from Authorization header
    const authHeader = req.headers['authorization'] as string;
    const { conversation_id } = req.body;
    
    // Check if Authorization header is provided
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'API Gateway Service: Authorization header is required'
      });
    }
    
    // Extract token from Bearer format
    const apiKey = authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : authHeader;
    
    // Check if conversation_id is provided if required
    if (requireConversationId && !conversation_id) {
      return res.status(400).json({
        success: false,
        error: 'API Gateway Service: conversation_id is required'
      });
    }
    
    try {
      // Validate the API key
      const validation = await validateApiKey(apiKey);
      
      if (!validation.valid) {
        return res.status(401).json({
          success: false,
          error: 'API Gateway Service: Invalid API key'
        });
      }

      // Set userId in the request object for the logging middleware
      (req as any).userId = validation.userId;

      // Forward the request to the service
      const result = await forwardRequest(
        serviceUrl,
        endpoint,
        req.body,
        validation.userId,
        authHeader // Pass the full Authorization header to downstream services
      );
      
      res.status(result.status).json(result.data);
    } catch (error) {
      console.error('Error in request handler:', error);
      res.status(500).json({
        success: false,
        error: 'API Gateway Service: Server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
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
 * Requires both API key and conversation_id
 */
app.post('/generate', createRequestHandler(MODEL_SERVICE_URL, '/generate'));

/**
 * Utility service endpoints
 * All endpoints require API key validation
 */
// Forward all utility endpoints with the common pattern /utility/* to the utility service
app.post('/utility/*', async (req: express.Request, res: express.Response) => {
  // Extract API key from Authorization header
  const authHeader = req.headers['authorization'] as string;
  
  // Check if Authorization header is provided
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: 'API Gateway Service: Authorization header is required'
    });
  }
  
  // Extract token from Bearer format
  const apiKey = authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : authHeader;
  
  try {
    // Validate the API key
    const validation = await validateApiKey(apiKey);
    
    if (!validation.valid) {
      return res.status(401).json({
        success: false,
        error: 'API Gateway Service: Invalid API key'
      });
    }
    
    // Set userId in the request object for the logging middleware
    (req as any).userId = validation.userId;
    
    // Extract the path after /utility to forward to the utility service
    const utilityPath = req.path.replace('/utility', '');
    
    // Forward the request to the utility service
    const result = await forwardRequest(
      UTILITY_SERVICE_URL,
      utilityPath,
      req.body,
      validation.userId,
      authHeader // Pass the full Authorization header
    );
    
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error('Error in utility endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'API Gateway Service: Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Add a GET handler for utility endpoints
app.get('/utility/*', async (req: express.Request, res: express.Response) => {
  // Extract API key from Authorization header
  const authHeader = req.headers['authorization'] as string;
  
  // Check if Authorization header is provided
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: 'API Gateway Service: Authorization header is required'
    });
  }
  
  // Extract token from Bearer format
  const apiKey = authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : authHeader;
  
  try {
    // Validate the API key
    const validation = await validateApiKey(apiKey);
    
    if (!validation.valid) {
      return res.status(401).json({
        success: false,
        error: 'API Gateway Service: Invalid API key'
      });
    }
    
    // Set userId in the request object for the logging middleware
    (req as any).userId = validation.userId;
    
    // Extract the path after /utility to forward to the utility service
    const utilityPath = req.path.replace('/utility', '');
    
    // Forward the request to the utility service
    const result = await forwardRequest(
      UTILITY_SERVICE_URL,
      utilityPath,
      req.query, // For GET requests, forward query parameters
      validation.userId,
      authHeader // Pass the full Authorization header
    );
    
    return res.status(result.status).json(result.data);
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