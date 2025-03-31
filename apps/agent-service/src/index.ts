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
import { createAgent } from './lib/agent.js';
import { User } from './types/index.js';
import { Readable } from 'stream';
import { ToolExecutionError } from 'ai';
import { InvalidToolArgumentsError } from 'ai';
import { NoSuchToolError } from 'ai';

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
app.use(cors({
  // Allow credentials and set exposed headers for streaming
  credentials: true,
  exposedHeaders: ['Content-Type', 'Cache-Control', 'Connection']
}));
app.use(express.json());

/**
 * Authentication middleware - extracts user from x-user-* headers
 * These headers are set by the API Gateway from the validated API key
 */
app.use((req, res, next) => {
  try {
    // Get user ID from header set by API gateway middleware
    const userId = req.headers['x-user-id'] as string;
    console.log(`[Agent Service] User authenticated: ${userId}`);
    
    if (userId) {
      // Set user object on request for route handlers
      req.user = {
        id: userId,
      };
    }
    
    next();
  } catch (error) {
    console.error('[Agent Service] Error processing request:', error);
    next();
  }
});

/**
 * Health check endpoint
 * Returns status information about the service
 */
app.get('/health', (req, res) => {
  console.log(`📡 [AGENT SERVICE] Health check request received from ${req.ip}`);
  
  // Get server address info safely
  let addressInfo = null;
  try {
    const serverObj = (req as any).socket?.server || (req as any).connection?.server;
    if (serverObj && typeof serverObj.address === 'function') {
      addressInfo = serverObj.address();
    }
  } catch (serverError) {
    console.error(`⚠️ [AGENT SERVICE] Error getting server info:`, serverError);
  }
  
  // Prepare health response
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
  
  res.status(200).json(healthResponse);
});

/**
 * Streaming endpoint - /stream
 * 
 * Handles AI text generation with streaming responses
 * Follows Server-Sent Events (SSE) protocol compatible with Vercel AI SDK
 */
app.post('/stream', async (req, res) => {
  const { messages, conversation_id } = req.body;
  console.log(`[Agent Service]: Streaming request received` + JSON.stringify(messages));
  console.log(`[Agent Service]: Streaming request received` + conversation_id);
  
  // Extract user ID from req.user (set by auth middleware)
  const userId = (req as any).user?.id as string;
  const apiKey = req.headers['x-api-key'] as string;
  
  // Validate required parameters
  if (!messages) {
    return res.status(400).json({ 
      error: '[Agent Service] Messages is required',
      details: 'Please provide messages in the request body'
    });
  }
  
  if (!userId) {
    return res.status(401).json({ 
      error: '[Agent Service] User authentication required',
      details: 'User ID not found in request'
    });
  }

  if (!conversation_id) {
    return res.status(400).json({ 
      error: '[Agent Service] conversation_id is required',
      details: 'Please provide a conversation_id in the request body'
    });
  }
  
  try {
    // Verify API key configuration
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('Anthropic API key not found in environment variables');
    }
    
    // Process the request with our streaming agent
    console.log(`[Agent Service] Processing request for user:${userId}, conversation:${conversation_id}`);
    
    // Create the agent with credentials
    const agent = await createAgent({
      userId,
      conversationId: conversation_id,
      apiKey
    });
    console.log(`[Agent Service]:` + messages);
    // Get the streaming result from the agent
    const stream = await agent.stream(messages);
    
    // Stream directly to Express response
    // @ts-ignore - StreamResult includes pipeDataStreamToResponse method
    await stream.pipeDataStreamToResponse(res, {
      getErrorMessage: error => {
        if (NoSuchToolError.isInstance(error)) {
          return 'The model tried to call a unknown tool: ' + error.toolName;
        } else if (InvalidToolArgumentsError.isInstance(error)) {
          return 'The model called a tool with invalid arguments: ' + error.toolName;
        } else if (ToolExecutionError.isInstance(error)) {
          return 'An error occurred during tool execution: ' + error.toolName;
        } else {
          return 'An unknown error occurred.';
        }
      },
    });
    
  } catch (error) {
    console.error('[Agent Service] Error streaming message with agent:', error);
    
    // Structured error response
    res.status(500).json({ 
      error: 'Failed to process message',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🤖 [AGENT SERVICE] Port ${PORT}`);
  console.log(`🌐 [AGENT SERVICE] Environment: ${nodeEnv}`);
  console.log(`🔑 [AGENT SERVICE] Anthropic API Key ${process.env.ANTHROPIC_API_KEY ? 'is configured' : 'is MISSING'}`);
  console.log(`🔗 [AGENT SERVICE] API Gateway URL: ${process.env.API_GATEWAY_URL || 'not set'}`);
});
