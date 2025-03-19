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
  const { prompt, user_id, conversation_id } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }
  
  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }

  if (!conversation_id) {
    return res.status(400).json({ error: 'conversation_id is required' });
  }
  
  try {
    // Check if we have an API key configured
    if (!process.env.ANTHROPIC_API_KEY) {
      // Fallback to simplified response if no API key
      console.log(`No ANTHROPIC_API_KEY found, using fallback response for prompt: "${prompt}"`);
      
      // Return a simplified response as fallback
      return res.status(200).json({
        generated_text: `Hello! This is the HelloWorld model service (simplified mode).\n\nYou asked: "${prompt}"\n\nI'm running in fallback mode because the API key for Claude is not configured. Please set the ANTHROPIC_API_KEY environment variable to enable the full LangGraph ReAct agent.`,
        conversation_id
      });
    }
    
    // Process the prompt with our ReAct agent
    console.log(`Received prompt: "${prompt}" from user: ${user_id}, conversation: ${conversation_id}`);
    const response = await processWithReActAgent(prompt, user_id, conversation_id);
    
    // Return the raw agent response without additional formatting
    res.status(200).json(response);
  } catch (error) {
    console.error('Error processing prompt with ReAct agent:', error);
    
    // Provide a helpful error message
    res.status(500).json({ 
      error: 'Failed to process prompt',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Streaming LLM generation endpoint using ReAct agent
app.post('/generate/stream', async (req, res) => {
  const { prompt, user_id, stream_modes = ['messages', 'events'], conversation_id } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
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
      console.log(`No ANTHROPIC_API_KEY found, using fallback response for prompt: "${prompt}"`);
      
      // Return a simplified response as fallback in SSE format
      res.write(`data: ${JSON.stringify({
        type: 'simplified_fallback',
        generated_text: `Hello! This is the HelloWorld model service (simplified mode).\n\nYou asked: "${prompt}"\n\nI'm running in fallback mode because the API key for Claude is not configured. Please set the ANTHROPIC_API_KEY environment variable to enable the full LangGraph ReAct agent.`,
        conversation_id
      })}\n\n`);
      
      res.write(`data: [DONE]\n\n`);
      return res.end();
    }
    
    // Process the prompt with our streaming ReAct agent
    console.log(`Streaming prompt: "${prompt}" with modes: ${stream_modes.join(', ')}, conversation: ${conversation_id}`);
    
    // Get the streaming generator
    const stream = await streamWithReActAgent(prompt, stream_modes, user_id, conversation_id);
    
    // Stream each raw chunk directly to the client without any additional processing
    for await (const chunk of stream) {
      // Write chunk in SSE format
      res.write(`data: ${chunk}\n\n`);
    }
    
    // Signal the end of the stream
    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (error) {
    console.error('Error streaming prompt with ReAct agent:', error);
    
    // Provide a helpful error message in SSE format
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: 'Failed to process prompt',
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