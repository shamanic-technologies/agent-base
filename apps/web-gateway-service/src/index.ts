/**
 * Web Gateway Service
 * 
 * A central entry point for web applications to access all microservices.
 * Handles routing, authentication, and request forwarding to appropriate services.
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios, { AxiosError } from 'axios';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';

// Load environment variables
dotenv.config();

// Constants and configuration
const app = express();
const PORT = process.env.PORT;

// Service URLs
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3005';
const DB_SERVICE_URL = process.env.DB_SERVICE_URL || 'http://localhost:3006';
const MODEL_SERVICE_URL = process.env.MODEL_SERVICE_URL || 'http://localhost:3001';
const API_GATEWAY_SERVICE_URL = process.env.API_GATEWAY_SERVICE_URL || 'http://localhost:3002';
const KEYS_SERVICE_URL = process.env.KEYS_SERVICE_URL || 'http://localhost:3003';
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3007';

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests from this IP, please try again after 15 minutes"
});

// Apply rate limiting to all routes
app.use(apiLimiter);

/**
 * Helper function to forward requests to microservices
 */
async function forwardRequest(targetUrl: string, req: express.Request, res: express.Response) {
  const requestUrl = `${targetUrl}${req.url}`;
  
  try {
    const response = await axios({
      method: req.method,
      url: requestUrl,
      data: req.method !== 'GET' ? req.body : undefined,
      headers: {
        ...req.headers as any,
        host: new URL(targetUrl).host
      },
      // Forward cookies for authentication
      withCredentials: true,
      // Never follow redirects, always pass them through to the client
      maxRedirects: 0,
    });
    
    // Forward the response status, headers, and data
    res.status(response.status);
    
    // Forward relevant headers
    const headersToForward = ['content-type', 'set-cookie', 'authorization', 'location'];
    headersToForward.forEach(header => {
      if (response.headers[header]) {
        res.setHeader(header, response.headers[header]);
      }
    });
    
    return res.send(response.data);
  } catch (error) {
    console.error(`Error forwarding request to ${targetUrl}${req.url}:`, error);
    
    const axiosError = error as AxiosError;
    
    if (axiosError.response) {
      // Forward the error status and response from the microservice
      
      // Preserve any redirect status and headers
      if (axiosError.response.status >= 300 && axiosError.response.status < 400) {
        res.status(axiosError.response.status);
        
        // Copy all headers from the response
        Object.entries(axiosError.response.headers).forEach(([key, value]) => {
          if (value) res.setHeader(key, value);
        });
        
        return res.end();
      }
      
      return res.status(axiosError.response.status).send(axiosError.response.data);
    } else if (axiosError.request) {
      // The request was made but no response was received
      return res.status(502).json({
        success: false,
        error: `Web Gateway Service: Could not connect to ${new URL(targetUrl).hostname}`
      });
    } else {
      // Something happened in setting up the request
      return res.status(500).json({
        success: false,
        error: 'Web Gateway Service: Internal error'
      });
    }
  }
}

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    services: {
      auth: AUTH_SERVICE_URL,
      database: DB_SERVICE_URL,
      model: MODEL_SERVICE_URL,
      api_gateway: API_GATEWAY_SERVICE_URL,
      keys: KEYS_SERVICE_URL,
      payment: PAYMENT_SERVICE_URL
    }
  });
});

// Create routers for service endpoints
const authRouter = express.Router();
const databaseRouter = express.Router();
const keysRouter = express.Router();
const generateRouter = express.Router();
const paymentRouter = express.Router();
const oauthRouter = express.Router();

// Auth service route handler
authRouter.all('*', (req, res) => {
  return forwardRequest(AUTH_SERVICE_URL, req, res);
});

// OAuth route handler
oauthRouter.all('*', (req, res) => {
  // When a request comes to /oauth/google, inside this handler req.url is just '/google'
  // We need to add back the '/oauth' prefix for the auth service to recognize the route
  const modifiedReq = Object.assign({}, req, {
    url: `/oauth${req.url}`
  });
  return forwardRequest(AUTH_SERVICE_URL, modifiedReq, res);
});

// Database service route handler
databaseRouter.all('*', (req, res) => {
  return forwardRequest(DB_SERVICE_URL, req, res);
});

// Keys service route handler
keysRouter.all('*', (req, res) => {
  return forwardRequest(KEYS_SERVICE_URL, req, res);
});

// Model service route handler (via proxy)
generateRouter.all('*', (req, res) => {
  return forwardRequest(API_GATEWAY_SERVICE_URL, req, res);
});

// Payment service route handler
paymentRouter.all('*', (req, res) => {
  return forwardRequest(PAYMENT_SERVICE_URL, req, res);
});

// Mount the routers
app.use('/auth', authRouter);
app.use('/oauth', oauthRouter);
app.use('/database', databaseRouter);
app.use('/keys', keysRouter);
app.use('/generate', generateRouter);
app.use('/payment', paymentRouter);

/**
 * 404 Handler for unknown routes
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Web Gateway Service: Endpoint not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚪 Web Gateway Service running on port ${PORT}`);
  console.log('Connected to services:');
  console.log(`🔐 Auth Service: ${AUTH_SERVICE_URL}`);
  console.log(`💾 Database Service: ${DB_SERVICE_URL}`);
  console.log(`🔑 Keys Service: ${KEYS_SERVICE_URL}`);
  console.log(`�� Model Service (via API Gateway): ${API_GATEWAY_SERVICE_URL}`);
  console.log(`💳 Payment Service: ${PAYMENT_SERVICE_URL}`);
}); 