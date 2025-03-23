/**
 * LangGraph ReAct Agent Service
 * 
 * A simple Express server that implements a Claude ReAct agent.
 * Uses LangGraph for handling the agent's reasoning and acting process.
 */
// Import and configure dotenv first
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import express from 'express';
import cors from 'cors';
import { processWithReActAgent, streamWithReActAgent } from './lib/react-agent.js';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
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
const PORT = process.env.PORT || 3001;

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
  res.status(200).json({ 
    status: 'healthy',
    environment: nodeEnv,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// LLM generation endpoint using ReAct agent
app.post('/generate', async (req, res) => {
  const { prompt: message, conversation_id } = req.body;
  
  // Extract user ID from req.user (set by auth middleware)
  const userId = req.user?.id as string;
  
  // Get API key from x-api-key header (if present)
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!message) {
    return res.status(400).json({ error: '[Model Service] Message is required' });
  }
  
  if (!userId) {
    return res.status(400).json({ error: '[Model Service] User authentication required' });
  }

  if (!conversation_id) {
    return res.status(400).json({ error: '[Model Service] conversation_id is required' });
  }
  
  try {
    // Check if we have an API key configured
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('[Model Service] Missing ANTHROPIC_API_KEY environment variable');
      throw new Error('Anthropic API key not found in environment variables');
    }
    
    // Create a HumanMessage for the message
    const humanMessage = new HumanMessage(message);
    
    // Process the prompt with our ReAct agent, passing along the API key for utilities
    console.log(`[Model Service] Received prompt: "${message.substring(0, 100)}..." from user: ${userId}, conversation: ${conversation_id}`);
    const response = await processWithReActAgent(humanMessage, userId, conversation_id, apiKey);
    
    // Return the raw agent response without additional formatting
    res.status(200).json(response);
  } catch (error) {
    console.error('[Model Service] Error processing message with ReAct agent:', error);
    
    let statusCode = 500;
    let errorMessage = 'Failed to process message';
    let errorDetails = error instanceof Error ? error.message : 'Unknown error';
    
    // Check for specific error types to provide better error messages
    if (errorDetails.includes('rate limit') || errorDetails.includes('quota')) {
      statusCode = 429;
      errorMessage = 'Rate limit exceeded';
    } else if (errorDetails.includes('authenticate') || errorDetails.includes('unauthorized') || errorDetails.includes('forbidden')) {
      statusCode = 403;
      errorMessage = 'API authentication error';
    } else if (errorDetails.includes('timeout') || errorDetails.includes('timed out')) {
      statusCode = 504;
      errorMessage = 'Request timed out';
    }
    
    // Provide a helpful error message
    res.status(statusCode).json({ 
      error: `[Model Service] ${errorMessage}`,
      details: errorDetails,
      conversation_id
    });
  }
});

// Streaming LLM generation endpoint using ReAct agent
app.post('/generate/stream', async (req, res) => {
  const { prompt: message, stream_modes, conversation_id } = req.body;
  
  // Extract user ID from req.user (set by auth middleware)
  const userId = req.user?.id as string;
  
  // Get API key from x-api-key header (if present)
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!message) {
    return res.status(400).json({ error: '[Model Service] Message is required' });
  }
  
  if (!userId) {
    return res.status(400).json({ error: '[Model Service] User authentication required' });
  }

  if (!conversation_id) {
    return res.status(400).json({ error: '[Model Service] conversation_id is required' });
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
    
    // Create a HumanMessage for the message
    const humanMessage = new HumanMessage(message);
    
    // Process the prompt with our streaming ReAct agent
    console.log(`[Model Service] Streaming message: "${message}" with modes: ${stream_modes.join(', ')}, conversation: ${conversation_id}`);
    
    // Get the streaming generator with API key
    const stream = await streamWithReActAgent(humanMessage, stream_modes, userId, conversation_id, apiKey);
    
    // Stream each raw chunk directly to the client without any additional processing
    for await (const chunk of stream) {
      // Write chunk in SSE format
      res.write(`data: ${chunk}\n\n`);
    }
    
    // Signal the end of the stream
    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (error) {
    console.error('[Model Service] Error streaming message with ReAct agent:', error);
    
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
  console.log(`🤖 LangGraph ReAct Agent Service running on port ${PORT}`);
  console.log(`🌐 Environment: ${nodeEnv}`);
  console.log(`🔑 API Key ${process.env.ANTHROPIC_API_KEY ? 'is' : 'is NOT'} configured`);
  
  // Log server address information for debugging
  const addressInfo = server.address();
  if (addressInfo && typeof addressInfo !== 'string') {
    console.log(`📡 Server listening on ${addressInfo.address}:${addressInfo.port} (${addressInfo.family})`);
  }
  
  // Log configuration URLs
  console.log(`🔗 UTILITY_SERVICE_URL: ${process.env.UTILITY_SERVICE_URL || 'not set'}`);
  console.log(`🔗 API_GATEWAY_URL: ${process.env.API_GATEWAY_URL || 'not set'}`);
});
