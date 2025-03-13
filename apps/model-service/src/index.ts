/**
 * HelloWorld Model Service
 * 
 * A simple Express server that simulates an LLM agent response.
 * In a real implementation, this would call an actual LLM API.
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

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

// LLM generation endpoint
app.post('/generate', (req, res) => {
  const { prompt } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }
  
  // In a real implementation, this would call an actual LLM API
  // For now, we'll just return a simple response
  const response = {
    model: 'hello-world-llm',
    generated_text: `Hello, World! You asked: "${prompt}". This is a simple AI response.`,
    tokens: {
      prompt_tokens: prompt.split(' ').length,
      completion_tokens: 20,
      total_tokens: prompt.split(' ').length + 20
    },
    request_id: `req_${Date.now()}`
  };
  
  // Simulate some processing time
  setTimeout(() => {
    res.status(200).json(response);
  }, 500);
});

// Start server
app.listen(PORT, () => {
  console.log(`🤖 Model Service running at http://localhost:${PORT}`);
}); 