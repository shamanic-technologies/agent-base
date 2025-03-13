/**
 * LangGraph ReAct Agent Service
 * 
 * A simple Express server that implements a Claude ReAct agent.
 * Uses LangGraph for handling the agent's reasoning and acting process.
 */
import express from 'express';
import cors from 'cors';
import { processWithReActAgent } from './react-agent';

// Export agent configuration types and utilities
export * from './lib/agent-config';
export * from './lib/create-agent';

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
}); 