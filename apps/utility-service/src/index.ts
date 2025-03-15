/**
 * Utility Service
 * 
 * A simple Express server that provides utility functions for the application.
 * This service offers utilities for GitHub operations including Codespaces.
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

// Import GitHub Codespace utilities
import {
  GitHubCreateCodespaceUtility,
  GitHubDestroyCodespaceUtility
} from './lib/github/github-codespace-utilities';

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
  const { operation, input } = req.body as UtilityRequest;
  
  if (!operation) {
    res.status(400).json({ error: 'Operation is required' });
    return;
  }
  
  try {
    // Process the utility operation
    const result = await processUtilityOperation(operation as UtilityOperation, input);
    
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
  const utilities = [
    'utility_get_current_datetime',
    'utility_github_create_codespace',
    'utility_github_destroy_codespace',
    'utility_github_get_code',
    'utility_github_list_directory',
    'utility_github_read_file',
    'utility_github_create_file',
    'utility_github_update_file',
    'utility_github_lint_code',
    'utility_github_run_code',
    'utility_github_deploy_code'
  ];
  
  res.status(200).json({ utilities });
});

// Endpoint to get utility info
app.get('/utility/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  
  // Define utility information
  const utilityInfo: Record<string, any> = {
    utility_get_current_datetime: {
      name: 'utility_get_current_datetime',
      description: 'Get the current date and time in different formats',
      schema: {
        type: 'object',
        properties: {
          format: {
            type: 'string',
            description: 'Optional date format (ISO, UTC, or custom format)',
            default: 'ISO'
          }
        }
      }
    },
    utility_github_create_codespace: {
      name: 'utility_github_create_codespace',
      description: 'Create a GitHub Codespace using environment variables',
      schema: {
        type: 'object',
        properties: {},
        note: 'No input required. Uses GITHUB_OWNER and GITHUB_REPO from environment variables.'
      }
    },
    utility_github_destroy_codespace: {
      name: 'utility_github_destroy_codespace',
      description: 'Destroy a GitHub Codespace',
      schema: {
        type: 'object',
        properties: {
          codespaceId: {
            type: 'string',
            description: 'ID of the codespace to destroy'
          }
        },
        required: ['codespaceId']
      }
    }
  };

  // Return the utility info if it exists
  if (utilityInfo[id]) {
    res.status(200).json(utilityInfo[id]);
  } else {
    res.status(404).json({ error: 'Utility not found' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🔧 Utility Service running at http://localhost:${PORT}`);
  console.log(`🌐 Environment: ${nodeEnv}`);
  console.log(`🧩 GitHub Codespaces API enabled`);
}); 