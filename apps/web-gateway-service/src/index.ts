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
import path from 'path';
import fs from 'fs';
import { authMiddleware } from './middleware/auth-middleware';
import { tokenCache } from './utils/token-cache';
import { User } from './types';

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

// Check required environment variables
const requiredEnvVars = [
  'PORT',
  'AUTH_SERVICE_URL',
  'DB_SERVICE_URL',
  'MODEL_SERVICE_URL',
  'API_GATEWAY_SERVICE_URL',
  'KEYS_SERVICE_URL',
  'PAYMENT_SERVICE_URL',
  'LOGGING_SERVICE_URL',
  'WEB_GATEWAY_API_KEY'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

// Constants and configuration
const app = express();
const PORT = process.env.PORT;

// Service URLs with non-null assertion to handle TypeScript
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL!;
const DB_SERVICE_URL = process.env.DB_SERVICE_URL!;
const MODEL_SERVICE_URL = process.env.MODEL_SERVICE_URL!;
const API_GATEWAY_SERVICE_URL = process.env.API_GATEWAY_SERVICE_URL!;
const KEYS_SERVICE_URL = process.env.KEYS_SERVICE_URL!;
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL!;
const LOGGING_SERVICE_URL = process.env.LOGGING_SERVICE_URL!;

// API key for gateway access
const API_KEY = process.env.WEB_GATEWAY_API_KEY!;

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
 * API Key Authentication Middleware
 * Ensures only authorized clients can access the gateway
 */
app.use((req, res, next) => {
  // Skip API key check for health endpoint
  if (req.path === '/health') {
    return next();
  }

  // Define a whitelist of allowed OAuth paths
  const ALLOWED_OAUTH_PATHS = [
    '/oauth/google',          // Initial OAuth redirect to Google
    '/oauth/google/callback', // Callback from Google after authentication
    // Add other provider paths here as needed
  ];

  // Use exact path matching for allowed OAuth endpoints
  if (ALLOWED_OAUTH_PATHS.includes(req.path)) {
    // For callback endpoints, validate basic OAuth parameters if it's a callback
    if (req.path.includes('/callback') && !req.query.code) {
      console.warn(`Invalid OAuth callback request: missing code parameter`);
      return res.status(400).json({
        success: false,
        error: 'Invalid OAuth callback request'
      });
    }
    
    // Allow the OAuth flow to proceed without API key
    return next();
  }
  
  // For all other endpoints, require API key
  const apiKey = req.headers['x-api-key'] as string;
  if (API_KEY && (!apiKey || apiKey !== API_KEY)) {
    console.warn(`Unauthorized gateway access attempt from ${req.ip}`);
    return res.status(403).json({
      success: false,
      error: 'Unauthorized access to gateway'
    });
  }
  
  next();
});

// JWT Authentication middleware
// Validates tokens and populates req.user for authenticated requests
app.use(authMiddleware);

console.log('[Web Gateway] Auth middleware applied');

/**
 * Helper function to forward requests to microservices
 */
async function forwardRequest(targetUrl: string, req: express.Request, res: express.Response) {
  const requestUrl = `${targetUrl}${req.url}`;
  
  // Debug log for auth validation endpoint
  if (req.url.includes('/auth/validate')) {
    console.log(`[Web Gateway] Forward request to ${requestUrl}`);
    console.log(`[Web Gateway] Request method: ${req.method}`);
    
    // Fix: Add null check for req.headers
    if (req.headers) {
      console.log(`[Web Gateway] Request headers before axios:`, 
                  Object.keys(req.headers).map(key => 
                    `${key}: ${key.toLowerCase() === 'authorization' ? 
                      (typeof req.headers[key] === 'string' ? 
                       req.headers[key].substring(0, 10) + '...' : 'complex value') : 
                      'masked'}`
                  ));
    } else {
      console.log(`[Web Gateway] Request headers are undefined or null`);
    }
  }
  
  try {
    const axiosConfig = {
      method: req.method,
      url: requestUrl,
      data: req.method !== 'GET' ? req.body : undefined,
      headers: {
        ...(req.headers || {}), // Fix: Provide default empty object if headers are undefined
        host: new URL(targetUrl).host
      },
      // Forward cookies for authentication
      withCredentials: true,
      // Never follow redirects, always pass them through to the client
      maxRedirects: 0,
    };
    
    // Debug log axios config for auth validation endpoint
    if (req.url.includes('/auth/validate')) {
      console.log(`[Web Gateway] Axios config headers:`, 
                  axiosConfig.headers ? Object.keys(axiosConfig.headers).map(key => 
                    `${key}: ${key.toLowerCase() === 'authorization' ? 
                      (typeof (axiosConfig.headers as Record<string, any>)[key] === 'string' ? 
                       (axiosConfig.headers as Record<string, any>)[key].substring(0, 10) + '...' : 'complex value') : 
                      'masked'}`
                  ) : 'No headers');
      console.log(`[Web Gateway] Axios request body:`, axiosConfig.data ? 'present' : 'none');
    }
    
    const response = await axios(axiosConfig);
    
    // Forward the response status, headers, and data
    res.status(response.status);
    
    // Forward all headers from the response, with special handling for cookies
    Object.entries(response.headers).forEach(([key, value]) => {
      if (value) {
        // For set-cookie headers, ensure they are properly preserved
        if (key.toLowerCase() === 'set-cookie') {
          console.log(`[Web Gateway] Found Set-Cookie header: ${typeof value}`, 
                      Array.isArray(value) ? `Array with ${value.length} items` : 'Single value');
          
          if (Array.isArray(value)) {
            value.forEach((cookie, i) => {
              console.log(`[Web Gateway] Setting cookie[${i}]:`, cookie.substring(0, 30) + '...');
              res.append('Set-Cookie', cookie);
            });
          } else {
            console.log(`[Web Gateway] Setting cookie:`, value.substring(0, 30) + '...');
            res.append('Set-Cookie', value);
          }
        } else {
          res.setHeader(key, value);
        }
      }
    });
    
    // For redirect responses (like OAuth redirects), just send the response without a body
    if (response.status >= 300 && response.status < 400) {
      console.log(`[Web Gateway] Forwarding ${response.status} redirect to: ${response.headers.location}`);
      console.log(`[Web Gateway] Response headers:`, Object.fromEntries(Object.entries(res.getHeaders())));
      return res.end();
    }
    
    return res.send(response.data);
  } catch (error) {
    console.error(`[Web Gateway] Error forwarding request to ${targetUrl}${req.url}:`, error);
    
    const axiosError = error as AxiosError;
    
    if (axiosError.response) {
      // Forward the error status and response from the microservice
      
      // Preserve any redirect status and headers
      if (axiosError.response.status >= 300 && axiosError.response.status < 400) {
        res.status(axiosError.response.status);
        console.log(`[Web Gateway] Handling error redirect (${axiosError.response.status}) to: ${axiosError.response.headers.location}`);
        
        // Copy all headers from the response
        Object.entries(axiosError.response.headers).forEach(([key, value]) => {
          if (value) {
            // Special handling for Set-Cookie headers
            if (key.toLowerCase() === 'set-cookie') {
              console.log(`[Web Gateway] Found Set-Cookie header: ${typeof value}`, 
                         Array.isArray(value) ? `Array with ${value.length} items` : 'Single value');
              
              if (Array.isArray(value)) {
                value.forEach((cookie, i) => {
                  console.log(`[Web Gateway] Setting cookie[${i}]:`, cookie.substring(0, 30) + '...');
                  res.append('Set-Cookie', cookie);
                });
              } else {
                console.log(`[Web Gateway] Setting cookie:`, typeof value === 'string' ? value.substring(0, 30) + '...' : value);
                res.append('Set-Cookie', value);
              }
            } else {
              res.setHeader(key, value);
            }
          }
        });
        
        console.log(`[Web Gateway] Response headers after processing:`, Object.fromEntries(Object.entries(res.getHeaders())));
        return res.end();
      }
      
      return res.status(axiosError.response.status).send(axiosError.response.data);
    } else if (axiosError.request) {
      // The request was made but no response was received
      return res.status(502).json({
        success: false,
        error: `[Web Gateway] Could not connect to ${new URL(targetUrl).hostname}`
      });
    } else {
      // Something happened in setting up the request
      return res.status(500).json({
        success: false,
        error: '[Web Gateway] Internal error'
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
const loggingRouter = express.Router();

// Auth service route handler
authRouter.all('*', (req, res) => {
  // Clear token from cache on logout
  if (req.url === '/logout' && req.headers.authorization) {
    const token = req.headers.authorization.startsWith('Bearer ')
      ? req.headers.authorization.substring(7)
      : undefined;
      
    if (token) {
      tokenCache.invalidate(token);
      console.log('[Web Gateway] Invalidated token in cache for logout');
    }
  }

  // Log headers for debugging, especially for /auth/validate endpoint
  if (req.url === '/validate') {
    console.log(`[Web Gateway] Forwarding to auth/validate with method ${req.method} and headers:`, 
      req.headers ? Object.keys(req.headers).map(key => `${key}: ${key.toLowerCase() === 'authorization' ? 'Bearer ***' : '***'}`) : 'No headers');
    
    if (req.headers && req.headers.authorization) {
      console.log(`[Web Gateway] Authorization header is present and starts with:`, 
        req.headers.authorization.substring(0, 10) + '...');
    } else {
      console.log(`[Web Gateway] No Authorization header found in request to auth service`);
    }
    
    // For /validate endpoint, ensure we're using POST regardless of incoming method
    if (req.method !== 'POST') {
      console.log(`[Web Gateway] Converting ${req.method} request to POST for auth/validate`);
      req.method = 'POST';
    }
  }
  
  // When a request comes to /auth/validate, inside this handler req.url is just '/validate'
  // We need to add back the '/auth' prefix for the auth service to recognize the route
  const modifiedReq = Object.assign({}, req, {
    url: `/auth${req.url}`,
    // Ensure headers exists to prevent null reference errors
    headers: req.headers || {}
  });

  return forwardRequest(AUTH_SERVICE_URL, modifiedReq, res);
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
  // Log headers for debugging when accessing /db/users/me
  if (req.url.includes('/db/users/me')) {
    console.log(`[Web Gateway] Database request to /db/users/me`);
    console.log(`[Web Gateway] Request headers user info:`, 
      req.user ? `User ID: ${(req.user as User).id}` : 'No user object',
      req.headers['x-user-id'] ? `x-user-id: ${req.headers['x-user-id']}` : 'No x-user-id header'
    );
  }
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

// Logging service route handler
loggingRouter.all('*', (req, res) => {
  return forwardRequest(LOGGING_SERVICE_URL, req, res);
});

// Mount the routers
app.use('/auth', authRouter);
app.use('/oauth', oauthRouter);
app.use('/database', databaseRouter);
app.use('/keys', keysRouter);
app.use('/generate', generateRouter);
app.use('/payment', paymentRouter);
app.use('/logging', loggingRouter);

/**
 * 404 Handler for unknown routes
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: '[Web Gateway] Endpoint not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚪 Web Gateway Service running on port ${PORT}`);
  console.log('Connected to services:');
  console.log(`🔐 Auth Service: ${AUTH_SERVICE_URL}`);
  console.log(`💾 Database Service: ${DB_SERVICE_URL}`);
  console.log(`🔑 Keys Service: ${KEYS_SERVICE_URL}`);
  console.log(`🔄 Model Service (via API Gateway): ${API_GATEWAY_SERVICE_URL}`);
  console.log(`💳 Payment Service: ${PAYMENT_SERVICE_URL}`);
}); 