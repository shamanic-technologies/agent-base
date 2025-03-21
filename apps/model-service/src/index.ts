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

import express from 'express';
import cors from 'cors';
import { processWithReActAgent, streamWithReActAgent } from './lib/react-agent.js';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

// Middleware setup
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

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
  const { prompt: message, user_id, conversation_id } = req.body;
  // Extract the API key from headers
  const authHeader = req.headers['authorization'] as string;
  
  if (!message) {
    return res.status(400).json({ error: '[Model Service] Message is required' });
  }
  
  if (!user_id) {
    return res.status(400).json({ error: '[Model Service] user_id is required' });
  }

  if (!conversation_id) {
    return res.status(400).json({ error: '[Model Service] conversation_id is required' });
  }
  
  try {
    // Check if we have an API key configured
    if (!process.env.ANTHROPIC_API_KEY) {
      // Fallback to simplified response if no API key
      throw new Error('Anthropic API key not found in environment variables');
    }
    
    // Extract API key from Authorization header if it exists
    let apiKey = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      apiKey = authHeader.substring(7);
    }
    
    // Create a HumanMessage for the message
    const humanMessage = new HumanMessage(message);
    
    // Process the prompt with our ReAct agent, passing along the API key
    console.log(`Received prompt: "${message}" from user: ${user_id}, conversation: ${conversation_id}`);
    const response = await processWithReActAgent(message, user_id, conversation_id, apiKey);
    
    // Return the raw agent response without additional formatting
    res.status(200).json(response);
  } catch (error) {
    console.error('Error processing message with ReAct agent:', error);
    
    // Provide a helpful error message
    res.status(500).json({ 
      error: 'Failed to process message',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Streaming LLM generation endpoint using ReAct agent
app.post('/generate/stream', async (req, res) => {
  const { prompt: message, user_id, stream_modes, conversation_id } = req.body;
  // Extract the API key from the Authorization header
  const authHeader = req.headers['authorization'] as string;
  
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }
  
  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }

  if (!conversation_id) {
    return res.status(400).json({ error: 'conversation_id is required' });
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
      // Return a simplified response as fallback in SSE format
    }
    
    // Extract API key from Authorization header if it exists
    let apiKey = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      apiKey = authHeader.substring(7);
    }
    
    // Create a HumanMessage for the message
    const humanMessage = new HumanMessage(message);
    
    // Process the prompt with our streaming ReAct agent
    console.log(`Streaming message: "${message}" with modes: ${stream_modes.join(', ')}, conversation: ${conversation_id}`);
    
    // Get the streaming generator with API key
    const stream = await streamWithReActAgent(message, stream_modes, user_id, conversation_id, apiKey);
    
    // Stream each raw chunk directly to the client without any additional processing
    for await (const chunk of stream) {
      // Write chunk in SSE format
      res.write(`data: ${chunk}\n\n`);
    }
    
    // Signal the end of the stream
    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (error) {
    console.error('Error streaming message with ReAct agent:', error);
    
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
app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🤖 LangGraph ReAct Agent Service running at http://0.0.0.0:${PORT}`);
  console.log(`🌐 Environment: ${nodeEnv}`);
  console.log(`🔑 API Key ${process.env.ANTHROPIC_API_KEY ? 'is' : 'is NOT'} configured`);
}); 