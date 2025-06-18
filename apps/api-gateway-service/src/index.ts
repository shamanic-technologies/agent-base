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
 * API Gateway Service
 * 
 * A service that acts as a security layer between clients and the actual services.
 */
import express from 'express';
import cors from 'cors';
import { authMiddleware } from './middlewares/auth.middleware.js';
// import { apiLoggerMiddleware } from './middlewares/logging.middleware.js';
import { creditValidationMiddleware } from './middlewares/creditValidationMiddleware.js';
import { configureRoutes } from './routes/index.js';


// Initialize the express app
const app = express();
const PORT = process.env.PORT;
const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL;
const UTILITY_TOOL_SERVICE_URL = process.env.UTILITY_TOOL_SERVICE_URL;
const KEY_SERVICE_URL = process.env.KEY_SERVICE_URL;
const SECRET_SERVICE_URL = process.env.SECRET_SERVICE_URL;
// const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL;
// Rename variable and environment key
const WEBHOOK_TOOL_API_URL = process.env.WEBHOOK_TOOL_API_URL; 
const API_TOOL_API_URL = process.env.API_TOOL_API_URL; // Add API Tool Service URL
const TOOL_AUTH_SERVICE_URL = process.env.TOOL_AUTH_SERVICE_URL;
const USER_SERVICE_URL = process.env.USER_SERVICE_URL;

const requiredEnvVars = {
  PORT,
  AGENT_SERVICE_URL,
  UTILITY_TOOL_SERVICE_URL,
  KEY_SERVICE_URL,
  SECRET_SERVICE_URL,
  WEBHOOK_TOOL_API_URL,
  API_TOOL_API_URL,
  TOOL_AUTH_SERVICE_URL,
  USER_SERVICE_URL,
};

for (const [key, value] of Object.entries(requiredEnvVars)) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

// Set up global middleware
app.use(cors());
// app.use(express.json({ limit: '50mb' }));
// app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Apply logging middleware for all API requests
// app.use(apiLoggerMiddleware);

// Simple request logger
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`);
  next();
});

// Configure routes
configureRoutes(
  app, 
  {
    agent: AGENT_SERVICE_URL!,
    secret: SECRET_SERVICE_URL!,
    utilityTool: UTILITY_TOOL_SERVICE_URL!,
    key: KEY_SERVICE_URL!,
    webhookTool: WEBHOOK_TOOL_API_URL!, // Pass renamed variable
    apiTool: API_TOOL_API_URL!, // Add API Tool URL to the configuration
    toolAuth: TOOL_AUTH_SERVICE_URL!,
    user: USER_SERVICE_URL!,
    // payment: PAYMENT_SERVICE_URL
  },
  authMiddleware(),
  creditValidationMiddleware // Pass the imported middleware
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
  console.log(`🔗 SECRET_SERVICE_URL: ${SECRET_SERVICE_URL || 'not set'}`);
  console.log(`🔗 WEBHOOK_TOOL_API_URL: ${WEBHOOK_TOOL_API_URL || 'not set'}`); 
  console.log(`🔗 API_TOOL_API_URL: ${API_TOOL_API_URL || 'not set'}`); // Log API Tool Service URL
  console.log(`🔗 TOOL_AUTH_SERVICE_URL: ${TOOL_AUTH_SERVICE_URL || 'not set'}`);
  console.log(`🔗 USER_SERVICE_URL: ${USER_SERVICE_URL || 'not set'}`);
  // console.log(`🔗 PAYMENT_SERVICE_URL: ${PAYMENT_SERVICE_URL || 'not set'}`); // Log Payment Service URL
});