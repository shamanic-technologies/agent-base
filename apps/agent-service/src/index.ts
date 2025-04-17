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

// Extend Express Request interface to include platformUserId
declare global {
  namespace Express {
    interface Request {
      // Augment request with the client user details (potentially partial)
      user?: Partial<ClientUser>; 
      // Store the platform user ID separately
      platformUserId?: string; 
    }
  }
}

// Load environment variables based on NODE_ENV
const nodeEnv = process.env.NODE_ENV || 'development';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Only load from .env file in development
if (nodeEnv === 'development') {
  // Construct path relative to the service's root directory (apps/agent-service)
  // Go up one level from src (__dirname) and then look for .env.local
  const envFile = path.resolve(__dirname, '..', '.env.local'); 
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
    // Get user IDs from headers set by API gateway middleware
    const clientUserId = req.headers['x-client-user-id'] as string;
    const platformUserIdHeader = req.headers['x-platform-user-id'] as string;
    
    if (clientUserId) {
      // Set client user object on request for route handlers
      // Store clientUserId in the 'id' field of the Partial<ClientUser>
      req.user = {
        id: clientUserId, // Store clientUserId here
      } as Partial<ClientUser>; // Assign as Partial<ClientUser>
      console.log(`[Agent Service Auth] Client User ID: ${clientUserId}`);
    } else {
      // Client User ID is essential for most operations
      console.warn('[Agent Service Auth] Missing x-client-user-id header.');
      // Optionally block requests
      // return res.status(401).json({ success: false, error: 'Missing x-client-user-id header' });
    }

    if (platformUserIdHeader) {
      // Store platform user ID separately for downstream calls
      req.platformUserId = platformUserIdHeader;
      console.log(`[Agent Service Auth] Platform User ID: ${platformUserIdHeader}`);
    } else {
       console.warn('[Agent Service Auth] Missing x-platform-user-id header.');
       // Optionally block requests
       // return res.status(401).json({ success: false, error: 'Missing x-platform-user-id header' });
    }
    
    next();
  } catch (error) {
    console.error('[Agent Service] Error processing request:', error);
    next();
  }
});

// Configure routes
configureRoutes(app);

// Start server
app.listen(PORT, () => {
  console.log(`🤖 [AGENT SERVICE] Port ${PORT}`);
  console.log(`🌐 [AGENT SERVICE] Environment: ${nodeEnv}`);
  console.log(`🔑 [AGENT SERVICE] Anthropic API Key ${process.env.ANTHROPIC_API_KEY ? 'is configured' : 'is MISSING'}`);
  console.log(`🔗 [AGENT SERVICE] API Gateway URL: ${process.env.API_GATEWAY_URL || 'not set'}`);
});
