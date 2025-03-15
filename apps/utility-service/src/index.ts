/**
 * Utility Service
 * 
 * A simple Express server that provides various utility functions for the application.
 * Uses LangGraph for advanced processing tasks if needed.
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

// Utility processing endpoint
app.post('/utility/process', async (req, res) => {
  const { operation, data } = req.body;
  
  if (!operation) {
    return res.status(400).json({ error: 'Operation is required' });
  }
  
  try {
    // Handle different types of utility operations
    let result;
    
    switch (operation) {
      case 'echo':
        result = { message: 'Echo service', data };
        break;
      case 'timestamp':
        result = { timestamp: new Date().toISOString() };
        break;
      default:
        return res.status(400).json({ error: `Unknown operation: ${operation}` });
    }
    
    // Return the result
    res.status(200).json(result);
  } catch (error) {
    console.error('Error processing utility operation:', error);
    res.status(500).json({ 
      error: 'Failed to process utility operation',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🔧 Utility Service running at http://localhost:${PORT}`);
  console.log(`🌐 Environment: ${nodeEnv}`);
}); 