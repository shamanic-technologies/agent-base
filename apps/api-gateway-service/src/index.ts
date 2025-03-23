/**
 * HelloWorld API Gateway Service
 * 
 * A service that validates API keys and forwards requests to the Model Service and Utility Service.
 * This acts as a security layer between clients and the actual services.
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { apiLoggerMiddleware } from './middlewares/logging.middleware.js';
import { setupServerDebugger } from './utils/network.js';
import { authMiddleware } from './middlewares/auth.middleware.js';
import { configureRoutes } from './routes/index.js';

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

// Initialize the express app
const app = express();
const PORT = process.env.PORT;
const MODEL_SERVICE_URL = process.env.MODEL_SERVICE_URL;
const UTILITY_SERVICE_URL = process.env.UTILITY_SERVICE_URL;
const KEY_SERVICE_URL = process.env.KEY_SERVICE_URL;
const LOGGING_SERVICE_URL = process.env.LOGGING_SERVICE_URL;

// Set up global middleware
app.use(cors());
app.use(express.json());

// Apply logging middleware to all routes that should be logged
app.use(apiLoggerMiddleware);

// Apply network debugging - removing potentially problematic network debugger
// setupNetworkDebugger();

// Configure routes
configureRoutes(
  app, 
  {
      model: MODEL_SERVICE_URL,
      utility: UTILITY_SERVICE_URL,
    key: KEY_SERVICE_URL,
    logging: LOGGING_SERVICE_URL
  },
  authMiddleware(KEY_SERVICE_URL)
);

// Start server
const server = app.listen(Number(PORT), '::', () => {
  console.log(`🚪 API Gateway Service running at http://localhost:${PORT}`);
  
  // Log server address information for debugging
  const addressInfo = server.address();
  if (addressInfo && typeof addressInfo !== 'string') {
    console.log(`📡 Server listening on ${addressInfo.address}:${addressInfo.port} (${addressInfo.family})`);
  }
  
  // Log service URLs for debugging
  console.log(`🔗 MODEL_SERVICE_URL: ${MODEL_SERVICE_URL || 'not set'}`);
  console.log(`🔗 UTILITY_SERVICE_URL: ${UTILITY_SERVICE_URL || 'not set'}`);
  console.log(`🔗 KEY_SERVICE_URL: ${KEY_SERVICE_URL || 'not set'}`);
  console.log(`🔗 LOGGING_SERVICE_URL: ${LOGGING_SERVICE_URL || 'not set'}`);
});

// Setup enhanced server debugging
setupServerDebugger(server);