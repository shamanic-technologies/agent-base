/**
 * LangGraph ReAct Agent Service
 * 
 * A simple Express server that implements a Claude ReAct agent.
 * Uses LangGraph for handling the agent's reasoning and acting process.
 */
// Import and configure dotenv first
import dotenv from 'dotenv';

// Load appropriate environment variables based on NODE_ENV
const nodeEnv = process.env.NODE_ENV || 'development';
if (nodeEnv === 'production') {
  console.log('🚀 Loading production environment from .env.prod');
  dotenv.config({ path: '.env.prod' });
} else {
  console.log('🔧 Loading development environment from .env.local');
  dotenv.config({ path: '.env.local' });
}

import express from 'express';
import cors from 'cors';
import { processWithReActAgent } from './lib/react-agent';

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
  const { prompt, thread_id } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }
  
  try {
    // Process the prompt with our ReAct agent
    console.log(`Received prompt: "${prompt}"`);
    const response = await processWithReActAgent(prompt, thread_id);
    
    // Return the agent's response
    res.status(200).json(response);
  } catch (error) {
    console.error('Error processing prompt with ReAct agent:', error);
    res.status(500).json({ 
      error: 'Failed to process prompt',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🤖 LangGraph ReAct Agent Service running at http://localhost:${PORT}`);
  console.log(`🌐 Environment: ${nodeEnv}`);
  console.log(`🔑 API Key ${process.env.ANTHROPIC_API_KEY ? 'is' : 'is NOT'} configured`);
}); 