/**
 * Claude 3.7 Sonnet Agent Service with Vercel AI SDK
 * 
 * A production-ready Express server implementing Claude 3.7 Sonnet with Vercel AI SDK.
 * This service is optimized for streaming responses with high-quality AI text generation.
 * Features enhanced reasoning capabilities through Claude 3.7 Sonnet's thinking process.
 */
// Import and configure dotenv first
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url'; // Import needed for __dirname in ES Modules

// Import routes configuration
import { configureRoutes } from './routes/index.js';
// Import specific user types
import { ClientUser, PlatformUser } from '@agent-base/types'; 
// Import the centralized error handler
import { agentServiceErrorHandler } from './lib/utils/errorHandlers.js';

// Load environment variables based on NODE_ENV
const nodeEnv = process.env.NODE_ENV || 'development';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Only load from .env file in development
if (nodeEnv === 'development') {
  // Construct path relative to the service's root directory (apps/agent-service)
  // Go up one level from src (__dirname) and then look for .env
  const envFile = path.resolve(__dirname, '..', '.env'); 
  if (fs.existsSync(envFile)) {
    console.log(`🔧 Loading development environment from ${envFile}`);
    dotenv.config({ path: envFile });
  } else {
    console.log(`Local environment file ${envFile} not found for agent-service, using default environment variables.`);
  }
} else {
  console.log('🚀 Production environment detected, using Railway configuration.');
}

// Middleware setup
const app = express();
const PORT = process.env.PORT;

// Middleware
app.use(cors({
  // Allow credentials and set exposed headers for streaming
  credentials: true,
  exposedHeaders: ['Content-Type', 'Cache-Control', 'Connection']
}));
// Increase the limit (e.g., to 50mb, adjust as needed)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

/**
 * Authentication middleware - extracts user IDs from headers
 * These headers are set by the API Gateway from the validated API key
 * - x-client-user-id: ID of the end-user using the client application. Used for most internal logic.
 * - x-platform-user-id: ID of the platform user (tenant/customer) owning the API key. Passed downstream.
 */
app.use((req, res, next) => {
  try {
    // Bypass authentication check for the health endpoint
    if (req.path === '/health') {
      return next(); // Skip header checks for /health
    }

    // Get user IDs from headers set by API gateway middleware
    const clientUserId = req.headers['x-client-user-id'] as string;
    const clientOrganizationId = req.headers['x-client-organization-id'] as string;
    const platformUserIdHeader = req.headers['x-platform-user-id'] as string;
    
    if (!clientUserId) {
      // Client User ID is essential for most operations
      console.warn('[Agent Service Auth] Missing x-client-user-id header.');
      // Block request if missing
      res.status(401).json({ success: false, error: 'Missing x-client-user-id header' });
      return; // Explicitly return to end execution here
    }
    req.clientUserId = clientUserId;
    
    if (!clientOrganizationId) {
      console.warn('[Agent Service Auth] Missing x-client-organization-id header.');
      // Block request if missing
      res.status(401).json({ success: false, error: 'Missing x-client-organization-id header' });
      return; // Explicitly return to end execution here
    }
    req.clientOrganizationId = clientOrganizationId;

    if (!platformUserIdHeader) {
       console.warn('[Agent Service Auth] Missing x-platform-user-id header.');
       // Block request if missing
       res.status(401).json({ success: false, error: 'Missing x-platform-user-id header' });
       return; // Explicitly return to end execution here
    }
    // Store platform user ID separately for downstream calls
    req.platformUserId = platformUserIdHeader;
    
    next(); // Continue to the next middleware/route
  } catch (error) {
    console.error('[Agent Service] Error processing request headers:', error);
    // Send a generic error response in case of unexpected issues during header processing
    res.status(500).json({ success: false, error: 'Internal server error processing authentication headers' });
    // Do not call next() here, as the response has been sent.
  }
});

// Configure routes
configureRoutes(app);

// Register the centralized error handling middleware.
// This MUST be registered after all other routes and middleware.
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  agentServiceErrorHandler(err, req, res, next);
});

// Start server
app.listen(PORT, () => {
  console.log(`🤖 [AGENT SERVICE] Port ${PORT}`);
  console.log(`🌐 [AGENT SERVICE] Environment: ${nodeEnv}`);
  console.log(`🔑 [AGENT SERVICE] Anthropic API Key ${process.env.ANTHROPIC_API_KEY ? 'is configured' : 'is MISSING'}`);
  console.log(`🔗 [AGENT SERVICE] API Gateway URL: ${process.env.API_GATEWAY_SERVICE_URL || 'not set'}`);
});
