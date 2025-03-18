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

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT;
const MODEL_SERVICE_URL = process.env.MODEL_SERVICE_URL;
const UTILITY_SERVICE_URL = process.env.UTILITY_SERVICE_URL;
const KEY_SERVICE_URL = process.env.KEY_SERVICE_URL;

// Middleware
app.use(cors());
app.use(express.json());

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

// Start server
app.listen(PORT, () => {
  console.log(`🔐 API Gateway Service running on port ${PORT}`);
  console.log(`🔄 Forwarding model requests to ${MODEL_SERVICE_URL}`);
  console.log(`🔄 Forwarding utility requests to ${UTILITY_SERVICE_URL}`);
  console.log(`🔑 Using Key Service at ${KEY_SERVICE_URL}`);
}); 