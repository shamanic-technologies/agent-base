/**
 * HelloWorld Model Service with Claude ReAct Agent
 * 
 * A simple Express server that simulates a Claude ReAct agent response.
 * Uses a simulated agent but structured for easy integration with real LangGraph implementation.
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { processWithReActAgent } from './agent';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// LLM generation endpoint using ReAct agent
app.post('/generate', async (req, res) => {
  const { prompt } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }
  
  try {
    // Process the prompt with our ReAct agent
    console.log(`Received prompt: "${prompt}"`);
    const response = await processWithReActAgent(prompt);
    
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
  console.log(`🤖 Claude ReAct Agent Service running at http://localhost:${PORT}`);
}); 