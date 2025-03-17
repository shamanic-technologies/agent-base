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

// In-memory API key storage (for testing only)
const TEST_API_KEYS = [
  {
    id: 'test-key-123',
    userId: 'test-user',
    key: 'helloworld_test123',
    active: true
  }
];

// Middleware
app.use(cors());
app.use(express.json());

// API key validation function
const validateApiKey = async (apiKey: string): Promise<{valid: boolean, userId?: string}> => {
  try {
    // First try to validate using the Key Service
    const response = await axios.post(`${KEY_SERVICE_URL}/keys/validate`, { apiKey });
    
    if (response.data.success) {
      return { 
        valid: true, 
        userId: response.data.data.userId 
      };
    }
  } catch (error) {
    console.log('Could not validate with Key Service, using fallback validation');
  }

  // Fallback to local validation for testing
  const matchingKey = TEST_API_KEYS.find(k => k.key === apiKey && k.active);
  
  if (matchingKey) {
    return { valid: true, userId: matchingKey.userId };
  }

  return { valid: false };
};

// API key middleware
const requireApiKey = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    return res.status(401).json({ 
      success: false,
      error: 'API key is required' 
    });
  }

  const { valid, userId } = await validateApiKey(apiKey);

  if (!valid) {
    return res.status(403).json({ 
      success: false,
      error: 'Invalid API key' 
    });
  }

  // Add userId to request for logging/tracking
  res.locals.userId = userId;
  next();
};

// Health check endpoint
app.get('/health', (req: express.Request, res: express.Response) => {
  res.status(200).json({ 
    status: 'healthy',
    services: {
      model: MODEL_SERVICE_URL,
      key: KEY_SERVICE_URL
    }
  });
});

// Proxy mode endpoint - returns HelloWorld message
app.get('/api/proxy-mode', requireApiKey, (req: express.Request, res: express.Response) => {
  res.status(200).json({
    success: true,
    message: "HelloWorld",
    user_id: res.locals.userId
  });
});

// Get test API key endpoint (for testing only)
app.get('/get-test-key', (req: express.Request, res: express.Response) => {
  const testKey = TEST_API_KEYS[0];
  
  if (!testKey) {
    return res.status(404).json({
      success: false,
      error: 'No test key available'
    });
  }
  
  res.status(200).json({ 
    success: true,
    apiKey: testKey.key
  });
});

// Proxy the request to the model service
app.post('/api/generate', requireApiKey, async (req: express.Request, res: express.Response) => {
  try {
    // Forward the request to the model service
    const response = await axios.post(`${MODEL_SERVICE_URL}/generate`, req.body);
    
    // Add usage tracking info
    if (response.data) {
      response.data.user_id = res.locals.userId;
    }
    
    // Return the model service response
    res.status(200).json(response.data);
  } catch (error: unknown) {
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

// Proxy streaming requests to the model service
app.post('/api/generate/stream', requireApiKey, async (req: express.Request, res: express.Response) => {
  try {
    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Add user ID to request body for tracking
    const requestBody = {
      ...req.body,
      user_id: res.locals.userId
    };
    
    // Forward the request to the model service using axios with response type 'stream'
    const response = await axios.post(`${MODEL_SERVICE_URL}/generate/stream`, requestBody, {
      responseType: 'stream'
    });
    
    // Forward each chunk from the model service to the client
    response.data.on('data', (chunk: Buffer) => {
      // Forward chunk to client
      res.write(chunk);
    });
    
    response.data.on('end', () => {
      // End the response when the model service stream ends
      res.end();
    });
    
    // Handle client disconnect
    req.on('close', () => {
      // Close the axios stream if client disconnects
      response.data.destroy();
    });
  } catch (error: unknown) {
    console.error('Error forwarding streaming request to model service:', error);
    
    // Handle streaming errors by sending SSE-formatted error messages
    if (axios.isAxiosError(error) && !error.response) {
      // Connection error
      res.write(`data: ${JSON.stringify({
        success: false,
        error: 'Could not connect to Model Service',
        user_id: res.locals.userId
      })}\n\n`);
    } else {
      // Other error
      const errorDetails = axios.isAxiosError(error) 
        ? error.response?.data || error.message 
        : error instanceof Error ? error.message : 'Unknown error';
      
      res.write(`data: ${JSON.stringify({
        success: false,
        error: 'Error communicating with model service',
        details: errorDetails,
        user_id: res.locals.userId
      })}\n\n`);
    }
    
    // End the stream with DONE marker
    res.write(`data: [DONE]\n\n`);
    res.end();
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🔐 Proxy Service running on port ${PORT}`);
  console.log(`🔄 Forwarding requests to Model Service at ${MODEL_SERVICE_URL}`);
  console.log(`🔑 Using Key Service at ${KEY_SERVICE_URL}`);
}); 