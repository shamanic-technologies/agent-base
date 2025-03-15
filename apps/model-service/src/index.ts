/**
 * Simple Model Service
 * 
 * A lightweight Express server that returns HelloWorld responses.
 * Simplified version without LangGraph for testing purposes.
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
// Removed import for ReAct agent

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

// Simplified generation endpoint that returns HelloWorld responses
app.post('/generate', async (req, res) => {
  const { prompt, thread_id } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }
  
  try {
    // Generate a simple response
    console.log(`Received prompt: "${prompt}"`);
    
    // Format the response with the prompt included
    const generated_text = `Hello! This is the HelloWorld model service.\n\nYou asked: "${prompt}"\n\nI'm a simplified version of the service for testing purposes. Once the full LangGraph implementation is ready, I'll be much smarter!`;
    
    // Return the formatted response
    res.status(200).json({ 
      generated_text,
      thread_id: thread_id || 'default-thread'
    });
  } catch (error) {
    console.error('Error generating response:', error);
    res.status(500).json({ 
      error: 'Failed to generate response',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🤖 Simple Model Service running at http://localhost:${PORT}`);
  console.log(`🌐 Environment: ${nodeEnv}`);
}); 