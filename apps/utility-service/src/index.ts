/**
 * Utility Service
 * 
 * A simple Express server that provides utility functions for the application.
 * This service offers utilities for GitHub operations including Codespaces.
 */
// Import and configure dotenv first
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables based on NODE_ENV
const nodeEnv = process.env.NODE_ENV || 'development';

// Only load from .env file in development
if (nodeEnv === 'development') {
  const envFile = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envFile)) {
    console.log('🔧 Loading development environment from .env.local');
    dotenv.config({ path: envFile });
  } else {
    console.log(`Environment file ${envFile} not found, using default environment variables.`);
  }
} else {
  console.log('🚀 Production environment detected, using Railway configuration.');
}

import express, { Request, Response } from 'express';
import cors from 'cors';
import { processUtilityOperation } from './lib/utility-functions.js';
import { UtilityOperation, UtilityRequest, UtilityResponse } from './types/index.js';

// Middleware setup
const app = express();
const PORT = process.env.PORT || 3008;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  console.log(`📡 [UTILITY SERVICE] Health check request received from ${req.ip}`);
  console.log(`📋 [UTILITY SERVICE] Request headers:`, JSON.stringify(req.headers, null, 2));
  
  // Log server address information - safely accessing server info
  let addressInfo = null;
  try {
    // Access server info safely (different ways depending on Express version)
    const server = (req.socket as any).server || req.connection?.server || res.connection?.server;
    if (server && typeof server.address === 'function') {
      addressInfo = server.address();
    }
  } catch (serverError) {
    console.error(`⚠️ [UTILITY SERVICE] Error getting server info:`, serverError);
  }
  console.log(`🔌 [UTILITY SERVICE] Server listening on:`, addressInfo);

  // Log environment information
  console.log(`🌐 [UTILITY SERVICE] Environment: ${nodeEnv}`);
  
  const healthResponse = { 
    status: 'healthy',
    environment: nodeEnv,
    version: process.env.npm_package_version,
    serverInfo: {
      address: typeof addressInfo === 'string' ? addressInfo : {
        address: addressInfo?.address,
        port: addressInfo?.port,
        family: addressInfo?.family
      }
    }
  };
  
  console.log(`✅ [UTILITY SERVICE] Responding with:`, JSON.stringify(healthResponse, null, 2));
  
  res.status(200).json(healthResponse);
});

// Define a route handler function separate from the app.post call
const utilityHandler = async (req: Request, res: Response): Promise<void> => {
  const { operation, input, conversation_id } = req.body as UtilityRequest;
  
  // Get user information from headers (passed by API Gateway)
  const userId = req.headers['x-user-id'] as string;
  const userEmail = req.headers['x-user-email'] as string;
  const userName = req.headers['x-user-name'] as string;
  const userProvider = req.headers['x-user-provider'] as string;
  
  // Log user context for tracing
  console.log(`Processing request with user headers:`, {
    userId,
    userEmail: userEmail || '(not provided)',
    userName: userName || '(not provided)',
    userProvider: userProvider || '(not provided)'
  });
  
  // Strictly require x-user-id header
  if (!userId) {
    res.status(400).json({ error: 'User identification is required via x-user-id header' });
    return;
  }
  
  if (!operation) {
    res.status(400).json({ error: 'Operation is required' });
    return;
  }
  
  if (!conversation_id) {
    res.status(400).json({ error: 'conversation_id is required' });
    return;
  }
  
  try {
    // Process the utility operation
    const result = await processUtilityOperation(
      operation as UtilityOperation, 
      userId,
      conversation_id,
      input
    );
    
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
  // Get user information from headers (passed by API Gateway)
  const userId = req.headers['x-user-id'] as string;
  
  // Get conversation ID from query parameters
  const conversation_id = req.query.conversation_id as string;
  
  // Strictly require x-user-id header
  if (!userId) {
    res.status(400).json({ error: 'User identification is required via x-user-id header' });
    return;
  }
  
  if (!conversation_id) {
    res.status(400).json({ error: 'conversation_id is required' });
    return;
  }
  
  // Log user and conversation context
  console.log(`Listing utilities for user: ${userId}`);
  console.log(`Conversation context: ${conversation_id}`);
  
  const utilities = [
    'utility_get_current_datetime',
    'utility_github_create_codespace',
    'utility_github_destroy_codespace',
    'utility_github_list_codespaces',
    'utility_github_get_code',
    'utility_github_list_directory',
    'utility_github_read_file',
    'utility_github_create_file',
    'utility_github_update_file',
    'utility_github_lint_code',
    'utility_github_run_code',
    'utility_github_deploy_code',
    'utility_firecrawl_extract_content',
    'utility_google_search',
    'utility_get_database',
    'utility_create_table',
    'utility_alter_table',
    'utility_delete_table',
    'utility_get_table',
    'utility_query_table'
  ];
  
  res.status(200).json({ utilities });
});

// Endpoint to get utility info
app.get('/utility/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  
  // Get user information from headers (passed by API Gateway)
  const userId = req.headers['x-user-id'] as string;

  // Get conversation ID from query parameters
  const conversation_id = req.query.conversation_id as string;
  
  // Strictly require x-user-id header
  if (!userId) {
    res.status(400).json({ error: 'User identification is required via x-user-id header' });
    return;
  }
  
  if (!conversation_id) {
    res.status(400).json({ error: 'conversation_id is required' });
    return;
  }
  
  // Log user and conversation context
  console.log(`Getting utility info for user: ${userId}`);
  console.log(`Conversation context: ${conversation_id}`);
  
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
    },
    utility_firecrawl_extract_content: {
      name: 'utility_firecrawl_extract_content',
      description: 'Extract clean, formatted content from web pages using FireCrawl API',
      schema: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'The URL to fetch content from (must include http:// or https://)'
          },
          onlyMainContent: {
            type: 'boolean',
            description: 'Whether to extract only the main content without navigation, headers, footers, etc.',
            default: true
          }
        },
        required: ['url']
      }
    },
    utility_google_search: {
      name: 'utility_google_search',
      description: 'Search the web using Google Search API',
      schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query to send to Google Search'
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results to return (default: 5, max: 10)',
            default: 5
          }
        },
        required: ['query']
      }
    },
    utility_get_database: {
      name: 'utility_get_database',
      description: 'Get information about the database, including tables and schemas',
      schema: {
        type: 'object',
        properties: {},
        note: 'No input required. Returns database information with tables.'
      }
    },
    utility_create_table: {
      name: 'utility_create_table',
      description: 'Create a new table in the database',
      schema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'The name of the table to create'
          },
          description: {
            type: 'string',
            description: 'A description of the table\'s purpose'
          },
          schema: {
            type: 'object',
            description: 'The schema definition for the table as a key-value object of field names and types'
          }
        },
        required: ['name', 'description', 'schema']
      }
    },
    utility_alter_table: {
      name: 'utility_alter_table',
      description: 'Alter an existing table in the database',
      schema: {
        type: 'object',
        properties: {
          table_id: {
            type: 'string',
            description: 'The ID of the table to alter'
          },
          new_name: {
            type: 'string',
            description: 'The new name for the table (optional)'
          },
          new_description: {
            type: 'string',
            description: 'The new description for the table (optional)'
          },
          new_schema: {
            type: 'object',
            description: 'The new schema definition for the table (optional)'
          }
        },
        required: ['table_id']
      }
    },
    utility_delete_table: {
      name: 'utility_delete_table',
      description: 'Delete an existing table from the database',
      schema: {
        type: 'object',
        properties: {
          table_id: {
            type: 'string',
            description: 'The ID of the table to delete'
          }
        },
        required: ['table_id']
      }
    },
    utility_get_table: {
      name: 'utility_get_table',
      description: 'Get information about a specific table in the database',
      schema: {
        type: 'object',
        properties: {
          table_id: {
            type: 'string',
            description: 'The ID of the table to retrieve'
          }
        },
        required: ['table_id']
      }
    },
    utility_query_table: {
      name: 'utility_query_table',
      description: 'Execute a query against a specific table in the database',
      schema: {
        type: 'object',
        properties: {
          table_id: {
            type: 'string',
            description: 'The ID of the table to query'
          },
          query: {
            type: ['string', 'object'],
            description: 'The query to execute (can be a string or an object)'
          }
        },
        required: ['table_id', 'query']
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
const server = app.listen(PORT, () => {
  console.log(`🛠️ [UTILITY SERVICE] Utility Service running on port ${PORT}`);
  console.log(`🌐 [UTILITY SERVICE] Environment: ${nodeEnv}`);
  
  // Log server address information for debugging
  const addressInfo = server.address();
  console.log(`📡 [UTILITY SERVICE] Server address info:`, JSON.stringify(addressInfo, null, 2));
  
  if (addressInfo && typeof addressInfo !== 'string') {
    console.log(`📡 [UTILITY SERVICE] Server listening on ${addressInfo.address}:${addressInfo.port} (${addressInfo.family})`);
    
    // Log network interfaces for debugging
    try {
      const os = require('os');
      const networkInterfaces = os.networkInterfaces();
      console.log(`🖧 [UTILITY SERVICE] Available network interfaces:`);
      
      for (const [name, interfaces] of Object.entries(networkInterfaces)) {
        if (interfaces) {
          interfaces.forEach(iface => {
            console.log(`   ${name}: ${iface.address} (${iface.family}) ${iface.internal ? 'internal' : 'external'}`);
          });
        }
      }
    } catch (error) {
      console.error(`❌ [UTILITY SERVICE] Error getting network interfaces:`, error);
    }
  }
  
  // Log configuration URLs
  console.log(`🔗 [UTILITY SERVICE] API_GATEWAY_URL: ${process.env.API_GATEWAY_URL || 'not set'}`);
}); 