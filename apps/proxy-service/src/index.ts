/**
 * HelloWorld Proxy Service
 * 
 * A service that validates API keys and forwards requests to the Model Service.
 * This acts as a security layer between clients and the actual model.
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT;
const MODEL_SERVICE_URL = process.env.MODEL_SERVICE_URL || 'http://localhost:3001';
const KEY_SERVICE_URL = process.env.KEY_SERVICE_URL || 'http://localhost:3003';

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
        userId: response.data.userId
      };
    }
    
    return { valid: false };
  } catch (error) {
    console.error('Error validating API key:', error);
    return { valid: false };
  }
};

/**
 * Health check endpoint
 * Returns the status of the proxy service and its connections
 */
app.get('/health', (req: express.Request, res: express.Response) => {
  res.status(200).json({
    status: 'healthy',
    services: {
      model: MODEL_SERVICE_URL,
      key: KEY_SERVICE_URL
    }
  });
});

/**
 * Generate endpoint
 * Validates API key and forwards request to model service
 */
app.post('/generate', async (req: express.Request, res: express.Response) => {
  const apiKey = req.headers['x-api-key'] as string;
  
  // Check if API key is provided
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key is required'
    });
  }
  
  // Validate the API key
  const validation = await validateApiKey(apiKey);
  
  if (!validation.valid) {
    return res.status(401).json({
      success: false,
      error: 'Invalid API key'
    });
  }
  
  try {
    // Forward the request to the model service
    const response = await axios.post(`${MODEL_SERVICE_URL}/generate`, req.body);
    
    // Add user ID tracking info
    if (response.data) {
      response.data.user_id = validation.userId;
    }
    
    // Return the model service response
    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error forwarding request to model service:', error);
    
    // Check if it's a connection error
    if (axios.isAxiosError(error) && !error.response) {
      return res.status(502).json({ 
        success: false,
        error: 'Could not connect to Model Service'
      });
    }
    
    // Forward the status code from the Model Service
    const status = axios.isAxiosError(error) ? error.response?.status || 500 : 500;
    
    res.status(status).json({ 
      success: false,
      error: 'Error communicating with model service',
      details: axios.isAxiosError(error) 
        ? error.response?.data || error.message 
        : error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🔐 Proxy Service running on port ${PORT}`);
  console.log(`🔄 Forwarding requests to Model Service at ${MODEL_SERVICE_URL}`);
  console.log(`🔑 Using Key Service at ${KEY_SERVICE_URL}`);
}); 