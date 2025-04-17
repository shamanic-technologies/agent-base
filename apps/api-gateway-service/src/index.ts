/**
 * API Gateway Service
 * 
 * A service that acts as a security layer between clients and the actual services.
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { authMiddleware } from './middlewares/auth.middleware.js';
import { apiLoggerMiddleware } from './middlewares/logging.middleware.js';
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
const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL;
const UTILITY_TOOL_SERVICE_URL = process.env.UTILITY_TOOL_SERVICE_URL;
const KEY_SERVICE_URL = process.env.KEY_SERVICE_URL;
const LOGGING_SERVICE_URL = process.env.LOGGING_SERVICE_URL;
const SECRET_SERVICE_URL = process.env.SECRET_SERVICE_URL;
// Set up global middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Apply logging middleware for all API requests
app.use(apiLoggerMiddleware);

// Simple request logger
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`);
  next();
});

// Configure routes
configureRoutes(
  app, 
  {
    agent: AGENT_SERVICE_URL,
    secret: SECRET_SERVICE_URL,
    utilityTool: UTILITY_TOOL_SERVICE_URL,
    key: KEY_SERVICE_URL,
    logging: LOGGING_SERVICE_URL
  },
  authMiddleware()
);

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚪 API Gateway Service running at http://localhost:${PORT}`);
  
  // Log server address information for debugging
  const addressInfo = server.address();
  if (addressInfo && typeof addressInfo !== 'string') {
    console.log(`📡 Server listening on ${addressInfo.address}:${addressInfo.port} (${addressInfo.family})`);
  }
  
  // Log service URLs for debugging
  console.log(`🔗 AGENT_SERVICE_URL: ${AGENT_SERVICE_URL || 'not set'}`);
  console.log(`🔗 UTILITY_TOOL_SERVICE_URL: ${UTILITY_TOOL_SERVICE_URL || 'not set'}`);
  console.log(`🔗 KEY_SERVICE_URL: ${KEY_SERVICE_URL || 'not set'}`);
  console.log(`🔗 LOGGING_SERVICE_URL: ${LOGGING_SERVICE_URL || 'not set'}`);
  console.log(`🔗 SECRET_SERVICE_URL: ${SECRET_SERVICE_URL || 'not set'}`);
});