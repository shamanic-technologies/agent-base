/**
 * Utility Tool Service API Server
 * 
 * Express server that provides RESTful API access to utility tools
 */
import 'dotenv/config';

console.log('🔵 [UTILITY SERVICE] Script starting...');
console.debug(`[UTILITY SERVICE] Initial NEON_API_KEY: ${process.env.NEON_API_KEY ? 'Set' : 'Not Set'}`);

import path from 'path';
import fs from 'fs';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import os from 'os';

// Import registry for INTERNAL tools
import { registry } from './registry/registry.js'; 

// Import client for EXTERNAL tools from the API client package
import {
    getAgentInternalAuthHeaders,
    listApiToolsInternal,
    getApiToolInfoInternal,
    executeApiToolInternal
} from '@agent-base/api-client'; 

// Import shared response types for consistency
import {
    ErrorResponse,
    ServiceResponse,
    UtilitiesList,
    ApiTool,
    InternalUtilityInfo,
    ExecuteToolPayload,
    InternalUtilityTool,
    ExecuteToolResult,
    ApiToolInfo,
    ApiToolExecutionResult,
    AgentInternalCredentials
} from '@agent-base/types';

// --- Ensure internal utilities are registered (if needed by side-effect imports)
import './index.js';

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
  res.status(200).json({
    status: 'healthy',
  });
});

app.get('/client-side-tools', (req, res) => {
  try {
    const clientSideTools = registry.listClientSideUtilities();
    const response: ServiceResponse<InternalUtilityInfo[]> = {
      success: true,
      data: clientSideTools,
    };
    res.status(200).json(response);
  } catch (error) {
    handleServiceError(res, error, '[GET /client-side-tools]');
  }
});

// --- Unified Tool Endpoints --- 

// List ALL available utilities (Internal + External)
app.get('/list', async (req, res): Promise<void> => {
  const logPrefix = '[GET /list]';
  const authHeaders = getAgentInternalAuthHeaders(req);
  if (!authHeaders.success) {
    console.error(`${logPrefix} Auth headers:`, authHeaders);
    res.status(401).json(authHeaders);
    return;
  }
  const agentServiceCredentials : AgentInternalCredentials = authHeaders.data;

  try {
    // Get internal tools
    const internalTools: UtilitiesList = registry.listInternalUtilities(); 
    // Get external tools
    let externalTools: UtilitiesList = []; 
    const externalResponse: ServiceResponse<ApiToolInfo[]> = await listApiToolsInternal(agentServiceCredentials);
    if (!externalResponse.success) {
      console.error(`${logPrefix} Error listing external tools:`, externalResponse);
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
app.get('/get', async (req, res): Promise<void> => {
  const { id } = req.query;
  const logPrefix = `[GET /get?id=${id}]`;
  if (!id || typeof id !== 'string') {
    console.error(`${logPrefix} Tool ID is required as a query parameter.`);
    return handleServiceError(res, { statusCode: 400, message: 'Tool ID is required as a query parameter.' }, '[GET /get]');
  }
  const authHeaders = getAgentInternalAuthHeaders(req);
  if (!authHeaders.success) {
    console.error(`${logPrefix} Auth headers:`, authHeaders);
    res.status(401).json(authHeaders);
    return;
  }
  const agentServiceCredentials : AgentInternalCredentials = authHeaders.data;
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
app.post('/run', async (req, res): Promise<void> => {
  const { id } = req.query;
  const logPrefix = `[POST /run?id=${id}]`;
  if (!id || typeof id !== 'string') {
    console.error(`${logPrefix} Tool ID is required as a query parameter.`);
    return handleServiceError(res, { statusCode: 400, message: 'Tool ID is required as a query parameter.' }, '[POST /run]');
  }
  const { conversationId, params } : ExecuteToolPayload = req.body;
  // Basic input validation
  if (!conversationId) {
    console.error(`${logPrefix} Conversation ID is required`);
    const errorResponse: ErrorResponse = { success: false, error: 'conversationId is required' };
    res.status(400).json(errorResponse);
    return;
  }
  const authHeaders = getAgentInternalAuthHeaders(req);
  if (!authHeaders.success) {
    console.error(`${logPrefix} Auth headers:`, authHeaders);
    res.status(401).json(authHeaders);
    return;
  }
  const agentServiceCredentials : AgentInternalCredentials = authHeaders.data;

  try {
    // 1. Try internal registry
    const internalUtility: InternalUtilityTool | undefined = registry.getInternalUtility(id);
    if (internalUtility) {
        // Pass clientUserId as the 'userId' parameter for internal execution
        // Ensure platformUserId and platformApiKey are passed according to the updated interface
        const executeToolResult: ServiceResponse<ExecuteToolResult> = await registry.executeInternalUtility(
            id, 
            agentServiceCredentials.clientUserId, 
            agentServiceCredentials.clientOrganizationId,
            agentServiceCredentials.platformUserId,
            agentServiceCredentials.platformApiKey,
            conversationId, 
            params, 
            agentServiceCredentials.agentId
        );

        if (!executeToolResult.success) {
          console.error(`${logPrefix} Internal tool execution failed: ${executeToolResult.error}`);
          res.status(502).json(executeToolResult);
          return;
        }
        res.status(200).json(executeToolResult); 
        return;
    }

    // 2. Try external service (requires full auth headers, now using internal client)
    const externalResponse: ServiceResponse<ApiToolExecutionResult> = await executeApiToolInternal(
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
  console.log(`📦 [UTILITY SERVICE] Available internal utilities: ${registry.getInternalUtilityIds().join(', ')}`);
});

export default app; 