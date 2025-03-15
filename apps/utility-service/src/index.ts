/**
 * Utility Service
 * 
 * A simple Express server that provides utility functions for the application.
 * This service offers an API endpoint to access the utility_get_current_datetime function.
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

import express, { Request, Response } from 'express';
import cors from 'cors';
import { processUtilityOperation } from './lib/utility-functions';
import { UtilityOperation, UtilityRequest, UtilityResponse } from './types';

// Middleware setup
const app = express();
const PORT = process.env.PORT || 3008;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'healthy',
    environment: nodeEnv,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Define a route handler function separate from the app.post call
const utilityHandler = async (req: Request, res: Response): Promise<void> => {
  const { operation, data } = req.body as UtilityRequest;
  
  if (!operation) {
    res.status(400).json({ error: 'Operation is required' });
    return;
  }
  
  // Validate operation is supported
  if (operation !== 'utility_get_current_datetime') {
    res.status(400).json({ error: `Unsupported operation: ${operation}` });
    return;
  }
  
  try {
    // Process the utility operation
    const result = await processUtilityOperation(operation as UtilityOperation, data);
    
    // Return the result
    res.status(200).json(result);
  } catch (error) {
    console.error('Error processing utility operation:', error);
    
    const response: UtilityResponse = { 
      error: 'Failed to process utility operation',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
    
    res.status(500).json(response);
  }
};

// Utility processing endpoint
app.post('/utility', utilityHandler);

// Endpoint to list available utilities
app.get('/utilities', (req: Request, res: Response) => {
  // For now, we only have the datetime utility
  const utilities = ['utility_get_current_datetime'];
  
  res.status(200).json({ utilities });
});

// Endpoint to get utility info
app.get('/utility/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  
  // For now, only support the datetime utility
  if (id === 'utility_get_current_datetime') {
    res.status(200).json({
      id: 'utility_get_current_datetime',
      description: `
        Use this tool to get the current date and time.
        
        You can request different formats:
        - 'iso' (default): ISO 8601 format (e.g., '2023-12-31T08:00:00.000Z')
        - 'locale': Human-readable format (e.g., 'December 31, 2023, 08:00:00 AM')
        - 'date': Date only (e.g., 'December 31, 2023')
        - 'time': Time only (e.g., '08:00:00 AM')
        - 'unix': Unix timestamp (seconds since epoch)
      `,
      schema: {
        format: {
          type: 'string',
          optional: true,
          description: "Optional format for the datetime: 'iso' (default), 'locale', 'date', 'time', or 'unix'"
        }
      }
    });
  } else {
    res.status(404).json({ error: `Utility not found: ${id}` });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🔧 Utility Service running at http://localhost:${PORT}`);
  console.log(`🌐 Environment: ${nodeEnv}`);
  console.log(`🧩 Available utilities: utility_get_current_datetime`);
}); 