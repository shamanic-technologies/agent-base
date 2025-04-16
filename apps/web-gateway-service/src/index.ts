/**
 * Web Gateway Service
 * 
 * A central entry point for web applications to access all microservices.
 * Handles routing, authentication, and request forwarding to appropriate services.
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { authMiddleware } from './middleware/auth-middleware';
import { tokenCache } from './utils/token-cache';
import { forwardRequest } from './utils/forward-request';

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
  'KEYS_SERVICE_URL',
  'PAYMENT_SERVICE_URL',
  'LOGGING_SERVICE_URL',
  'DATABASE_SERVICE_URL',
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
const KEYS_SERVICE_URL = process.env.KEYS_SERVICE_URL!;
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL!;
const LOGGING_SERVICE_URL = process.env.LOGGING_SERVICE_URL!;
const DATABASE_SERVICE_URL = process.env.DATABASE_SERVICE_URL!;
// API key for gateway access
const WEB_GATEWAY_API_KEY = process.env.WEB_GATEWAY_API_KEY!;

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
app.use(apiLimiter as any);

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
  const webGatewayAPIKey = req.headers['x-web-gateway-api-key'] as string;
  if (webGatewayAPIKey !== WEB_GATEWAY_API_KEY) {
    console.warn(`Unauthorized gateway access attempt using key: ${webGatewayAPIKey ? webGatewayAPIKey.substring(0, 5) + '...' : 'None'} from ${req.ip}`);
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
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    services: {
      auth: AUTH_SERVICE_URL,
      keys: KEYS_SERVICE_URL,
      payment: PAYMENT_SERVICE_URL,
      logging: LOGGING_SERVICE_URL,
      database: DATABASE_SERVICE_URL
    }
  });
});

// Create routers for allowed service endpoints
const authRouter = express.Router();
const keysRouter = express.Router();
const paymentRouter = express.Router();
const oauthRouter = express.Router();
const loggingRouter = express.Router();
const databaseRouter = express.Router();

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

  return forwardRequest(AUTH_SERVICE_URL, req, res);
});

// OAuth route handler (for Auth Service)
oauthRouter.all('*', (req, res) => {
  return forwardRequest(AUTH_SERVICE_URL, req, res);
});

// Keys service route handler
keysRouter.all('*', (req, res) => {  
  return forwardRequest(KEYS_SERVICE_URL, req, res);
});

// Payment service route handler
paymentRouter.all('*', (req, res) => {
  return forwardRequest(PAYMENT_SERVICE_URL, req, res);
});

// Logging service route handler
loggingRouter.all('*', (req, res) => {
  return forwardRequest(LOGGING_SERVICE_URL, req, res);
});

// Database service route handler
databaseRouter.all('*', (req, res) => {
  console.log('🗄️ Database service route handler'+ req.path);
  return forwardRequest(DATABASE_SERVICE_URL, req, res);
});

// Mount the allowed routers
app.use('/auth', authRouter);
app.use('/oauth', oauthRouter);
app.use('/keys', keysRouter);
app.use('/payment', paymentRouter);
app.use('/logging', loggingRouter);
app.use('/database', databaseRouter);
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
  console.log(`🔑 Keys Service: ${KEYS_SERVICE_URL}`);
  console.log(`💳 Payment Service: ${PAYMENT_SERVICE_URL}`);
  console.log(`📝 Logging Service: ${LOGGING_SERVICE_URL}`);
  console.log(`🗄️ Database Service: ${DATABASE_SERVICE_URL}`);
}); 