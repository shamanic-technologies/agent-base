import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables from .env first
const envFile = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envFile)) {
  console.log(`Loading environment from ${envFile}`);
  dotenv.config({ path: envFile });
} else {
  console.log(`Environment file ${envFile} not found, attempting to use system environment variables.`);
}

/**
 * Web Gateway Service
 * 
 * A central entry point for web applications to access all microservices.
 * Handles routing, authentication, and request forwarding to appropriate services.
 */
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { authMiddleware } from './middleware/auth-middleware.js';
import { apiKeyAuthMiddleware } from './middleware/api-key-auth-middleware.js';
import { forwardRequest } from './utils/forward-request.js';

// Check required environment variables
const requiredEnvVars = [
  'PORT',
  'KEY_SERVICE_URL',
  'PAYMENT_SERVICE_URL',
  'USER_SERVICE_URL',
  // 'LOGGING_SERVICE_URL',
  // 'DATABASE_SERVICE_URL',
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
const KEY_SERVICE_URL = process.env.KEY_SERVICE_URL!;
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL!;
const USER_SERVICE_URL = process.env.USER_SERVICE_URL!;

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
  max: 1000, // Limit each IP to 1000 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests from this IP, please try again after 15 minutes"
});

// Apply rate limiting to all routes
app.use(apiLimiter as any);

app.use(apiKeyAuthMiddleware); // Added new middleware

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
      keys: KEY_SERVICE_URL,
      payment: PAYMENT_SERVICE_URL,
      // logging: LOGGING_SERVICE_URL,
      // database: DATABASE_SERVICE_URL
    }
  });
  // Implicit void return is fine here, but can be explicit for clarity if desired
});

// Create routers for allowed service endpoints
const keysRouter = express.Router();
const paymentRouter = express.Router();
const loggingRouter = express.Router();
const databaseRouter = express.Router();

// Keys service route handler
keysRouter.all('/*', async (req, res) => {  
  await forwardRequest(KEY_SERVICE_URL, req, res);
});

// Payment service route handler
paymentRouter.all('/*', async (req, res) => {
  await forwardRequest(PAYMENT_SERVICE_URL, req, res);
});

// // Logging service route handler
// loggingRouter.all('/*', async (req, res) => {
//   await forwardRequest(LOGGING_SERVICE_URL, req, res);
// });

// // Database service route handler
// databaseRouter.all('/*', async (req, res) => {
//   console.log('🗄️ Database service route handler'+ req.path);
//   await forwardRequest(DATABASE_SERVICE_URL, req, res);
// });

// Mount the allowed routers
app.use('/keys', keysRouter);
app.use('/payment', paymentRouter);
// app.use('/logging', loggingRouter);
// app.use('/database', databaseRouter);
/**
 * 404 Handler for unknown routes
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: '[Web Gateway] Endpoint not found'
  });
  // Implicit void return is fine here
});

// Start server
app.listen(PORT, () => {
  console.log(`🚪 Web Gateway Service running on port ${PORT}`);
  console.log('Connected to services:');
  console.log(`🔑 Key Service: ${KEY_SERVICE_URL}`);
  console.log(`💳 Payment Service: ${PAYMENT_SERVICE_URL}`);
  console.log(`👤 User service: ${USER_SERVICE_URL}`);
  // console.log(`📝 Logging Service: ${LOGGING_SERVICE_URL}`);
  // console.log(`🗄️ Database Service: ${DATABASE_SERVICE_URL}`);
}); 