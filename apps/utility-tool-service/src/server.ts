/**
 * Utility Tool Service API Server
 * 
 * Express server that provides RESTful API access to utility tools
 */
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import os from 'os';

// --- Ensure utilities are registered by importing index.ts --- 
import './index.js';

// Import registry directly - side-effect imports below are redundant if index.ts is run
import { registry } from './registry/registry.js'; 

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
  console.log('🚀 Production environment detected, using configured environment variables.');
}

// Initialize Express
const app: express.Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  console.log(`📡 [UTILITY SERVICE] Health check request received from ${req.ip}`);

  // Get server address information
  let addressInfo = null;
  try {
    // @ts-ignore - Server info object access
    const serverObj = req.socket?.server || req.connection?.server;
    if (serverObj && typeof serverObj.address === 'function') {
      addressInfo = serverObj.address();
    }
  } catch (error) {
    console.error(`⚠️ [UTILITY SERVICE] Error getting server info:`, error);
  }
  
  // Return health response
  res.status(200).json({
    status: 'healthy',
    environment: nodeEnv,
    version: process.env.npm_package_version,
    serverInfo: {
      address: addressInfo
    }
  });
});

// List all available utilities
app.get('/get-list', (req, res) => {
  console.log(`📚 [UTILITY SERVICE] List utilities request received from ${req.ip}`);
  const utilities = registry.listUtilities();
  res.status(200).json({
    count: utilities.length,
    utilities
  });
});

// Keep legacy endpoint for internal use
app.get('/utilities', (req, res) => {
  console.log(`📚 [UTILITY SERVICE] Legacy list utilities request received from ${req.ip}`);
  const utilities = registry.listUtilities();
  res.status(200).json({
    count: utilities.length,
    utilities
  });
});

// Get info about a specific utility
app.get('/get-details/:id', (req, res) => {
  const { id } = req.params;
  console.log(`📚 [UTILITY SERVICE] Get utility info request for ${id} from ${req.ip}`);
  
  const utility = registry.getUtility(id);
  
  if (!utility) {
    return res.status(404).json({
      error: `Utility with ID '${id}' not found`,
      available_utilities: registry.getUtilityIds()
    });
  }
  
  res.status(200).json({
    id: utility.id,
    description: utility.description,
    schema: utility.schema
  });
});

// Execute a utility
app.post('/call-tool/:id', async (req, res) => {
  const { id } = req.params;
  const { input, conversation_id, user_id } = req.body;
  const agent_id = req.headers['x-agent-id'] as string | undefined;
  
  console.log(`⚙️ [UTILITY SERVICE] Execute utility request for ${id} from ${req.ip}`);
  if (agent_id) {
    console.log(`⚙️ [UTILITY SERVICE] Request made by agent: ${agent_id}`);
  }
  
  if (!conversation_id) {
    return res.status(400).json({ error: 'conversation_id is required' });
  }
  
  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }
  
  try {
    const result = await registry.execute(id, user_id, conversation_id, input, agent_id);
    
    if (result && result.error) {
      // Error returned from utility execution
      return res.status(400).json(result);
    }
    
    // Check if result already has a status field (like from generateSetupNeededResponse)
    if (result && result.status) {
      // Result already formatted with status, return directly
      return res.status(200).json(result);
    }
    
    // Otherwise wrap in standard success response
    res.status(200).json({
      status: 'success',
      data: result
    });
  }
  catch (error) {
    console.error(`❌ [UTILITY SERVICE] Error executing utility ${id}:`, error);
    res.status(500).json({
      error: `Error executing utility ${id}`,
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`🛠️ [UTILITY SERVICE] Utility Service running on port ${PORT}`);
  console.log(`🌐 [UTILITY SERVICE] Environment: ${nodeEnv}`);
  console.log(`📦 [UTILITY SERVICE] Available utilities: ${registry.getUtilityIds().join(', ')}`);
});

export default app; 