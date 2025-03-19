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

/**
 * API Logger Middleware
 * Logs API requests with API keys to the logging service
 */
const apiLoggerMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const startTime = Date.now();
  const apiKey = req.headers['x-api-key'] as string;
  const originalSend = res.send;
  let responseBody: any = null;

  // Only log requests with API keys
  if (!apiKey) {
    return next();
  }

  // Capture response body
  res.send = function (body) {
    responseBody = body;
    return originalSend.call(this, body);
  };

  // Process request when it completes
  res.on('finish', async () => {
    try {
      const duration = Date.now() - startTime;
      
      // Parse request and response bodies if they're JSON strings
      let parsedRequestBody = req.body;
      let parsedResponseBody = null;
      
      try {
        if (responseBody && typeof responseBody === 'string') {
          parsedResponseBody = JSON.parse(responseBody);
        } else {
          parsedResponseBody = responseBody;
        }
      } catch (e) {
        // If parsing fails, use the raw body
        parsedResponseBody = { raw: responseBody ? String(responseBody).substring(0, 500) : null };
      }
      
      // Sanitize bodies to prevent sensitive data logging (password, tokens, etc.)
      const sanitizedRequestBody = sanitizeBody(parsedRequestBody);
      const sanitizedResponseBody = sanitizeBody(parsedResponseBody);
      
      // Log the API call
      await fetch(`${LOGGING_SERVICE_URL}/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey,
          endpoint: req.originalUrl,
          method: req.method,
          statusCode: res.statusCode,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          requestId: req.headers['x-request-id'] as string,
          requestBody: sanitizedRequestBody,
          responseBody: sanitizedResponseBody,
          durationMs: duration
        })
      }).catch(error => {
        console.error('Failed to log API call:', error);
        // Don't block the response if logging fails
      });
    } catch (error) {
      console.error('Failed to log API call:', error);
      // Don't block the response if logging fails
    }
  });

  next();
};

/**
 * Sanitize request/response bodies to prevent logging sensitive data
 */
function sanitizeBody(body: any): any {
  if (!body) return null;
  
  // If it's not an object, return as is
  if (typeof body !== 'object') return body;
  
  // Clone the body to avoid modifying the original
  const sanitized = Array.isArray(body) ? [...body] : { ...body };
  
  // List of sensitive fields to redact
  const sensitiveFields = [
    'password', 'token', 'secret', 'api_key', 'apiKey', 'authorization',
    'credit_card', 'creditCard', 'ssn', 'social_security', 'socialSecurity'
  ];
  
  // Function to recursively sanitize an object
  const sanitizeObject = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;
    
    Object.keys(obj).forEach(key => {
      const lowerKey = key.toLowerCase();
      
      // Check if this is a sensitive field
      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        obj[key] = '[REDACTED]';
      } 
      // Recursively sanitize nested objects
      else if (obj[key] && typeof obj[key] === 'object') {
        sanitizeObject(obj[key]);
      }
    });
  };
  
  sanitizeObject(sanitized);
  return sanitized;
}

/**
 * Validates an API key against the Key Service
 * Returns the validation result and user ID if valid
 */
const validateApiKey = async (apiKey: string): Promise<{valid: boolean, userId?: string}> => {
  try {
    const response = await axios.post(`${KEY_SERVICE_URL}/keys/validate`, { apiKey });
    
    if (response.data.success) {
      return {
        valid: true,
        userId: response.data.data.userId
      };
    }
    
    return { valid: false };
  } catch (error) {
    console.error('API Gateway Service: Error validating API key:', error);
    return { valid: false };
  }
};

/**
 * Forwards a validated request to the specified service
 * Handles error responses and formatting
 */
const forwardRequest = async (
  serviceUrl: string, 
  endpoint: string, 
  requestBody: any, 
  userId: string
): Promise<{status: number, data: any}> => {
  try {
    // Create an enriched request body with the user ID
    const enrichedRequestBody = {
      ...requestBody,
      user_id: userId
    };
    
    console.log(`Forwarding request to ${serviceUrl}${endpoint} for user ID: ${userId}`);
    
    // Forward the enriched request to the service
    const response = await axios.post(`${serviceUrl}${endpoint}`, enrichedRequestBody);
    
    // Add user ID tracking info (in case it's not already included in response)
    if (response.data) {
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
          error: `API Gateway Service: Could not connect to service at ${serviceUrl}`
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
          : error instanceof Error ? error.message : 'Unknown error'
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
    const apiKey = req.headers['x-api-key'] as string;
    const { conversation_id } = req.body;
    
    // Check if API key is provided
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API Gateway Service: API key is required'
      });
    }
    
    // Check if conversation_id is provided if required
    if (requireConversationId && !conversation_id) {
      return res.status(400).json({
        success: false,
        error: 'API Gateway Service: conversation_id is required'
      });
    }
    
    // Validate the API key
    const validation = await validateApiKey(apiKey);
    
    if (!validation.valid) {
      return res.status(401).json({
        success: false,
        error: 'API Gateway Service: Invalid API key'
      });
    }

    // Forward the request to the service
    const result = await forwardRequest(
      serviceUrl,
      endpoint,
      req.body,
      validation.userId as string
    );
    
    res.status(result.status).json(result.data);
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
  const apiKey = req.headers['x-api-key'] as string;
  
  // Check if API key is provided
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API Gateway Service: API key is required'
    });
  }
  
  // Validate the API key
  const validation = await validateApiKey(apiKey);
  
  if (!validation.valid) {
    return res.status(401).json({
      success: false,
      error: 'API Gateway Service: Invalid API key'
    });
  }

  // Extract the path after /utility/
  const utilityPath = req.path.substring('/utility'.length);
  
  // Forward the request to the utility service
  const result = await forwardRequest(
    UTILITY_SERVICE_URL,
    utilityPath,
    req.body,
    validation.userId as string
  );
  
  res.status(result.status).json(result.data);
});

// Apply API logger middleware to all routes that use API keys
app.use('/generate', apiLoggerMiddleware);
app.use('/utility', apiLoggerMiddleware);

// Start server
app.listen(PORT, () => {
  console.log(`🔐 API Gateway Service running on port ${PORT}`);
  console.log(`🔄 Forwarding model requests to ${MODEL_SERVICE_URL}`);
  console.log(`🔄 Forwarding utility requests to ${UTILITY_SERVICE_URL}`);
  console.log(`🔑 Using Key Service at ${KEY_SERVICE_URL}`);
}); 