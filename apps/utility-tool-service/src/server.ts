/**
 * Utility Tool Service API Server
 * 
 * Express server that provides RESTful API access to utility tools
 */
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import os from 'os';

// Import registry for INTERNAL tools
import { registry } from './registry/registry.js'; 

// Import client for EXTERNAL tools from the API client package
import {
    listExternalToolsFromAgent,
    getExternalToolInfoFromAgent,
    executeExternalToolFromAgent,
} from '@agent-base/api-client'; // <--- Updated Import Path

// Import shared response types for consistency
import {
    ErrorResponse,
    ServiceResponse,
    UtilitiesList,
    ExternalUtilityTool,
    InternalUtilityInfo,
    ExecuteToolPayload,
    InternalUtilityTool,
    AgentServiceCredentials,
    ServiceCredentials,
    ExecuteToolResult
} from '@agent-base/types';
// // Define UtilityInfo locally for list/detail responses
// interface UtilityInfo {
//   id: string;
//   description: string;
//   // Use a union or a more generic structure for schema to accommodate both internal and external
//   schema: Record<string, ExternalUtilityParamSchema> | Record<string, UtilityToolSchema>; 
// }

// --- Ensure internal utilities are registered (if needed by side-effect imports)
import './index.js';

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
const PORT = process.env.PORT || 3050;

// Middleware
app.use(cors());
app.use(express.json());

// Helper to extract auth headers
const getAuthHeadersFromAgent = (req: Request): ServiceResponse<AgentServiceCredentials> => {
  const platformUserId = req.headers['x-platform-user-id'] as string | undefined;
  const clientUserId = req.headers['x-client-user-id'] as string | undefined;
  const platformApiKey = req.headers['x-platform-api-key'] as string | undefined;
  const agentId = req.headers['x-agent-id'] as string | undefined; // Agent ID if provided

  // Validate required headers for external call
  if (!platformUserId || !clientUserId || !platformApiKey || !agentId) {
    // Proceed with only internal tools, or return error depending on requirements
    return { success: false, error: 'Missing authentication headers for external tools' } as ErrorResponse;
  }  
  return { 
    success: true,
    data: {
        platformUserId,
        clientUserId,
        platformApiKey,
        agentId
    }
  };
};

// Centralized Error Handler
const handleServiceError = (res: Response, error: any, prefix: string) => {
    console.error(`❌ ${prefix} Error:`, error);
    const statusCode = error.statusCode || 500;
    const response: ServiceResponse<never> = {
        success: false,
        error: error.message || 'Internal Server Error',
        details: error.details || (error instanceof Error ? error.stack : String(error))
    };
    res.status(statusCode).json(response);
};

// Health check endpoint
app.get('/health', (req, res) => {
  console.log(`📡 [UTILITY SERVICE] Health check request received from ${req.ip}`);
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
  res.status(200).json({
    status: 'healthy',
    environment: nodeEnv,
    version: process.env.npm_package_version,
    serverInfo: { address: addressInfo }
  });
});

// --- Unified Tool Endpoints --- 

// List ALL available utilities (Internal + External)
app.get('/get-list', async (req, res) => {
  const logPrefix = '[GET /get-list]';
  const authHeaders = getAuthHeadersFromAgent(req);
  if (!authHeaders.success) {
    console.log(`${logPrefix} Auth headers:`, authHeaders);
    return res.status(401).json(authHeaders);
  }
  const agentServiceCredentials : AgentServiceCredentials = authHeaders.data;
  // Extract conversationId from query parameters
  const conversationId = req.query.conversationId as string | undefined;
  console.log(`${logPrefix} Conversation ID from query: ${conversationId}`); 

  try {
    // Get internal tools
    const internalTools: UtilitiesList = registry.listInternalUtilities(); 
    // Get external tools
    let externalTools: UtilitiesList = []; 
    const externalResponse: ServiceResponse<ExternalUtilityTool[]> = await listExternalToolsFromAgent(agentServiceCredentials, conversationId);
    if (!externalResponse.success) {
      console.log(`${logPrefix} Error listing external tools:`, externalResponse);
      return res.status(502).json(externalResponse);
    }
    // Map ExternalUtilityTool to UtilitiesListItem { id, description }
    externalTools = externalResponse.data.map(tool => ({ id: tool.id, description: tool.description }));

    // Combine lists
    const allTools = [...internalTools, ...externalTools];
    
    const response: ServiceResponse<{ count: number; utilities: UtilitiesList }> = {
      success: true,
      data: {
          count: allTools.length,
          utilities: allTools
      }
  };
  res.status(200).json(response);
  } catch (error) {
    handleServiceError(res, error, logPrefix);
  }
});

// Keep legacy endpoint for internal use (optional)
app.get('/utilities', (req, res) => {
  console.log(`📚 [GET /utilities - LEGACY] Request received from ${req.ip} - Redirecting to /get-list logic`);
  res.redirect(301, '/get-list');
});

// Get info about a specific utility (Internal or External)
app.get('/get-details/:id', async (req, res) => {
  const { id } = req.params;
  const logPrefix = `[GET /get-details/${id}]`;
  const authHeaders = getAuthHeadersFromAgent(req);
  if (!authHeaders.success) {
    console.log(`${logPrefix} Auth headers:`, authHeaders);
    return res.status(401).json(authHeaders);
  }
  const agentServiceCredentials : AgentServiceCredentials = authHeaders.data;
  // Extract conversationId from query parameters
  const conversationId = req.query.conversationId as string | undefined;
  console.log(`${logPrefix} Conversation ID from query: ${conversationId}`); 
  console.log(`📚 ${logPrefix} Request received from ${req.ip}`);
  
  try {
    // 1. Try internal registry
    const internalUtility: InternalUtilityTool = registry.getInternalUtility(id);
    if (internalUtility) {
        return res.status(200).json(internalUtility);
    }

    // 2. Try external service (requires auth headers)
    
    const externalResponse: ServiceResponse<ExternalUtilityTool> = await getExternalToolInfoFromAgent(
        agentServiceCredentials,
        conversationId,
        id
    );

    if (!externalResponse.success) {
        return res.status(502).json(externalResponse);
    }

    return res.status(200).json(externalResponse); 

  } catch (error) {
      handleServiceError(res, error, logPrefix);
  }
});

// Execute a utility (Internal or External)
app.post('/call-tool/:id', async (req, res) => {
  const { id } = req.params;
  const logPrefix = `[POST /call-tool/${id}]`;
  const { conversationId, params } : ExecuteToolPayload = req.body;
  // Basic input validation
  if (!conversationId) {
    console.log(`${logPrefix} Conversation ID is required`);
    return res.status(400).json({ success: false, error: 'conversationId is required' });
  }
  const authHeaders = getAuthHeadersFromAgent(req);
  if (!authHeaders.success) {
    console.log(`${logPrefix} Auth headers:`, authHeaders);
    return res.status(401).json(authHeaders);
  }
  const agentServiceCredentials : AgentServiceCredentials = authHeaders.data;

  try {
    // 1. Try internal registry
    const internalUtility: InternalUtilityTool = registry.getInternalUtility(id);
    if (internalUtility) {
        // Pass clientUserId as the 'userId' parameter for internal execution
        // Ensure platformUserId and platformApiKey are passed according to the updated interface
        const result: any = await registry.executeInternalUtility(
            id, 
            agentServiceCredentials.clientUserId, 
            agentServiceCredentials.platformUserId,
            agentServiceCredentials.platformApiKey,
            conversationId, 
            params, 
            agentServiceCredentials.agentId
        );
        
        return res.status(200).json(result); 
    }

    // 2. Try external service (requires full auth headers)
    console.log(`${logPrefix} Internal utility not found, calling external service.`);

    const externalResponse: ServiceResponse<ExecuteToolResult> = await executeExternalToolFromAgent(
        agentServiceCredentials,
        id,
        req.body
    );

    if (!externalResponse.success) {
      console.error(`${logPrefix} External tool execution failed: ${externalResponse.error}`);
      return res.status(502).json(externalResponse);
    }
    return res.status(200).json(externalResponse);

  } catch (error) {
    console.error(`${logPrefix} Error executing external tool: ${error}`);
    handleServiceError(res, error, logPrefix);
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`🛠️ [UTILITY SERVICE] Utility Service running on port ${PORT}`);
  console.log(`🌐 [UTILITY SERVICE] Environment: ${nodeEnv}`);
  console.log(`📦 [UTILITY SERVICE] Available internal utilities: ${registry.getInternalUtilityIds().join(', ')}`);
});

export default app; 