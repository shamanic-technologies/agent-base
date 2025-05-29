console.log('🔵 [UTILITY SERVICE] Script starting...');

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
    getAuthHeadersFromAgent,
    listApiToolsInternal,
    getApiToolInfoInternal,
    executeApiToolInternal
} from '@agent-base/api-client'; // <--- Updated Import Path

// Import shared response types for consistency
import {
    ErrorResponse,
    ServiceResponse,
    UtilitiesList,
    ApiTool,
    InternalUtilityInfo,
    ExecuteToolPayload,
    InternalUtilityTool,
    AgentServiceCredentials,
    InternalServiceCredentials,
    ExecuteToolResult,
    PlatformUserApiServiceCredentials,
    ClientUserApiServiceCredentials,
    ExternalServiceCredentials,
    ApiToolInfo,
    ApiToolExecutionResponse
} from '@agent-base/types';

// --- Ensure internal utilities are registered (if needed by side-effect imports)
import './index.js';

// Load environment variables based on NODE_ENV
const nodeEnv = process.env.NODE_ENV || 'development';

// Only load from .env file in development
if (nodeEnv === 'development') {
  const envFile = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envFile)) {
    console.log('🔧 Loading development environment from .env');
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

console.log('🟢 [UTILITY SERVICE] Middleware configured.');

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

// Health check endpoint (Simplified)
app.get('/health', (req, res) => {
  console.log(`📡 [UTILITY SERVICE] Health check request received from ${req.ip}. Responding OK.`);
  res.status(200).json({
    status: 'healthy',
    environment: nodeEnv,
  });
});

// --- Unified Tool Endpoints --- 

// List ALL available utilities (Internal + External)
app.get('/get-list', async (req, res): Promise<void> => {
  const logPrefix = '[GET /get-list]';
  const authHeaders = getAuthHeadersFromAgent(req);
  if (!authHeaders.success) {
    console.log(`${logPrefix} Auth headers:`, authHeaders);
    res.status(401).json(authHeaders);
    return;
  }
  const agentServiceCredentials : AgentServiceCredentials = authHeaders.data;

  try {
    // Get internal tools
    const internalTools: UtilitiesList = registry.listInternalUtilities(); 
    // Get external tools
    let externalTools: UtilitiesList = []; 
    const externalResponse: ServiceResponse<ApiToolInfo[]> = await listApiToolsInternal(agentServiceCredentials);
    if (!externalResponse.success) {
      console.log(`${logPrefix} Error listing external tools:`, externalResponse);
      res.status(502).json(externalResponse);
      return;
    }
    // Map ExternalUtilityTool to UtilitiesListItem { id, name, description }
    externalTools = externalResponse.data.map(tool => ({ id: tool.id, name: tool.name, description: tool.description }));

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
    return;
  }
});

// Get info about a specific utility (Internal or External)
app.get('/get-details/:id', async (req, res): Promise<void> => {
  const { id } = req.params;
  const logPrefix = `[GET /get-details/${id}]`;
  const authHeaders = getAuthHeadersFromAgent(req);
  if (!authHeaders.success) {
    console.log(`${logPrefix} Auth headers:`, authHeaders);
    res.status(401).json(authHeaders);
    return;
  }
  const agentServiceCredentials : AgentServiceCredentials = authHeaders.data;
  // Extract conversationId from query parameters
  const conversationId = req.query.conversationId as string | undefined;
  
  try {
    // 1. Try internal registry
    const internalUtility: InternalUtilityTool | undefined = registry.getInternalUtility(id);
    if (internalUtility) {
        const response: ServiceResponse<InternalUtilityTool> = {
            success: true,
            data: internalUtility
        };
        res.status(200).json(response);
        return;
    }

    // 2. Try external service (requires auth headers, now using internal client)
    
    const externalResponse: ServiceResponse<ApiToolInfo> = await getApiToolInfoInternal(
        agentServiceCredentials,
        id
    );

    if (!externalResponse.success) {
        console.log(`${logPrefix} Error getting external tool info:`, externalResponse);
        res.status(502).json(externalResponse);
        return;
    }

    res.status(200).json(externalResponse); 
    return;

  } catch (error) {
      handleServiceError(res, error, logPrefix);
      return;
  }
});

// Execute a utility (Internal or External)
app.post('/call-tool/:id', async (req, res): Promise<void> => {
  const { id } = req.params;
  const logPrefix = `[POST /call-tool/${id}]`;
  const { conversationId, params } : ExecuteToolPayload = req.body;
  // Basic input validation
  if (!conversationId) {
    console.log(`${logPrefix} Conversation ID is required`);
    const errorResponse: ErrorResponse = { success: false, error: 'conversationId is required' };
    res.status(400).json(errorResponse);
    return;
  }
  const authHeaders = getAuthHeadersFromAgent(req);
  if (!authHeaders.success) {
    console.log(`${logPrefix} Auth headers:`, authHeaders);
    res.status(401).json(authHeaders);
    return;
  }
  const agentServiceCredentials : AgentServiceCredentials = authHeaders.data;

  try {
    // 1. Try internal registry
    const internalUtility: InternalUtilityTool | undefined = registry.getInternalUtility(id);
    if (internalUtility) {
        // Pass clientUserId as the 'userId' parameter for internal execution
        // Ensure platformUserId and platformApiKey are passed according to the updated interface
        const result: ExecuteToolResult = await registry.executeInternalUtility(
            id, 
            agentServiceCredentials.clientUserId, 
            agentServiceCredentials.platformUserId,
            agentServiceCredentials.platformApiKey,
            conversationId, 
            params, 
            agentServiceCredentials.agentId
        );
        
        const response: ServiceResponse<ExecuteToolResult> = {
            success: true,
            data: result 
        };
        res.status(200).json(response); 
        return;
    }

    // 2. Try external service (requires full auth headers, now using internal client)

    const externalResponse: ServiceResponse<ApiToolExecutionResponse> = await executeApiToolInternal(
        agentServiceCredentials,
        id,
        req.body
    );

    if (!externalResponse.success) {
      console.error(`${logPrefix} External tool execution failed: ${externalResponse.error}`);
      res.status(502).json(externalResponse);
      return;
    }
    res.status(200).json(externalResponse);
    return;

  } catch (error) {
    console.error(`${logPrefix} Error executing external tool: ${error}`);
    handleServiceError(res, error, logPrefix);
    return;
  }
});

console.log(`🟡 [UTILITY SERVICE] Attempting to listen on port: ${PORT}`);

// Start the server
app.listen(PORT, () => {
  console.log(`✅ [UTILITY SERVICE] Successfully listening on port ${PORT}`);
  console.log(`🌐 [UTILITY SERVICE] Environment: ${nodeEnv}`);
  console.log(`📦 [UTILITY SERVICE] Available internal utilities: ${registry.getInternalUtilityIds().join(', ')}`);
});

export default app; 