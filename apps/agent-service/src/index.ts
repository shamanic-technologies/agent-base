/**
 * Claude 3.7 Sonnet Agent Service with Vercel AI SDK
 * 
 * A pure streaming-only Express server implementing Claude 3.7 Sonnet with Vercel AI SDK.
 * This service is 100% focused on streaming responses without any blocking calls.
 * Leverages Claude 3.7 Sonnet's extended thinking capabilities for real-time reasoning.
 */
// Import and configure dotenv first
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import express from 'express';
import cors from 'cors';
import { streamWithReActAgent } from './lib/react-agent.js';
import { User } from './types/index.js';

// Load environment variables based on NODE_ENV
const nodeEnv = process.env.NODE_ENV || 'development';

// Only load from .env file in development
if (nodeEnv === 'development') {
  const envFile = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envFile)) {
    console.log(`🔧 Loading development environment from ${envFile}`);
    dotenv.config({ path: envFile });
  } else {
    console.log(`Environment file ${envFile} not found, using default environment variables.`);
  }
} else {
  console.log('🚀 Production environment detected, using Railway configuration.');
}

// Middleware setup
const app = express();
const PORT = process.env.PORT;

// Middleware
app.use(cors());
app.use(express.json());

/**
 * Authentication middleware - extracts user from x-user-* headers
 * These headers are set by the API Gateway from the validated API key
 */
app.use((req, res, next) => {
  try {
    // Get user ID from header set by API gateway middleware
    const userId = req.headers['x-user-id'] as string;
    
    if (userId) {
      // Set user object on request for route handlers
      req.user = {
        id: userId,
        email: req.headers['x-user-email'] as string,
        name: req.headers['x-user-name'] as string,
        provider: req.headers['x-user-provider'] as string
      };
      console.log(`[Auth Middleware] User ID set from header: ${userId}`);
    }
    
    next();
  } catch (error) {
    console.error('[Auth Middleware] Error processing request:', error);
    next();
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  console.log(`📡 [AGENT SERVICE] Health check request received from ${req.ip}`);
  console.log(`📋 [AGENT SERVICE] Request headers:`, JSON.stringify(req.headers, null, 2));
  
  // Log server address information - safely accessing server info
  let addressInfo = null;
  try {
    // Use any for server access to avoid TypeScript errors
    const serverObj = (req as any).socket?.server || (req as any).connection?.server || (res as any).connection?.server;
    if (serverObj && typeof serverObj.address === 'function') {
      addressInfo = serverObj.address();
    }
  } catch (serverError) {
    console.error(`⚠️ [AGENT SERVICE] Error getting server info:`, serverError);
  }
  console.log(`🔌 [AGENT SERVICE] Server listening on:`, addressInfo);

  // Log environment information
  console.log(`🌐 [AGENT SERVICE] Environment: ${nodeEnv}`);
  console.log(`🔑 [AGENT SERVICE] API Key ${process.env.ANTHROPIC_API_KEY ? 'is' : 'is NOT'} configured`);
  
  const healthResponse = { 
    status: 'healthy',
    environment: nodeEnv,
    version: process.env.npm_package_version || '1.0.0',
    serverInfo: {
      address: typeof addressInfo === 'string' ? addressInfo : {
        address: addressInfo?.address,
        port: addressInfo?.port,
        family: addressInfo?.family
      }
    },
    implementation: 'Vercel AI SDK with Claude 3.7 Sonnet Streaming'
  };
  
  console.log(`✅ [AGENT SERVICE] Responding with:`, JSON.stringify(healthResponse, null, 2));
  
  res.status(200).json(healthResponse);
});

// Streaming agent generation endpoint
app.post('/generate', async (req, res) => {
  const { prompt: message, conversation_id } = req.body;
  
  // Extract user ID from req.user (set by auth middleware)
  const userId = (req as any).user?.id as string;
  
  // Get API key from x-api-key header (if present)
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!message) {
    return res.status(400).json({ error: '[Agent Service] Message is required' });
  }
  
  if (!userId) {
    return res.status(400).json({ error: '[Agent Service] User authentication required' });
  }

  if (!conversation_id) {
    return res.status(400).json({ error: '[Agent Service] conversation_id is required' });
  }
  
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  try {
    // Check if we have an API key configured
    if (!process.env.ANTHROPIC_API_KEY) {
      // Fallback to simplified response if no API key
      throw new Error('Anthropic API key not found in environment variables');
    }
    
    // Process the prompt with our streaming agent
    console.log(`[Agent Service] Streaming message: "${message.substring(0, 100)}..." from user: ${userId}, conversation: ${conversation_id}`);
    
    // Get the streaming generator with API key
    const stream = streamWithReActAgent(message, userId, conversation_id, apiKey);
    
    // Stream each raw chunk directly to the client without any additional processing
    for await (const chunk of stream) {
      // Write chunk in SSE format
      res.write(`data: ${chunk}\n\n`);
    }
    
    // Signal the end of the stream
    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (error) {
    console.error('[Agent Service] Error streaming message with agent:', error);
    
    // Provide a helpful error message in SSE format
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: 'Failed to process message',
      details: error instanceof Error ? error.message : 'Unknown error'
    })}\n\n`);
    
    res.write(`data: [DONE]\n\n`);
    res.end();
  }
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🤖 [AGENT SERVICE] Claude 3.7 Sonnet Agent Service with Vercel AI SDK running on port ${PORT}`);
  console.log(`🌐 [AGENT SERVICE] Environment: ${nodeEnv}`);
  console.log(`🔑 [AGENT SERVICE] API Key ${process.env.ANTHROPIC_API_KEY ? 'is' : 'is NOT'} configured`);
  
  // Log server address information for debugging
  const addressInfo = server.address();
  console.log(`📡 [AGENT SERVICE] Server address info:`, JSON.stringify(addressInfo, null, 2));
});
