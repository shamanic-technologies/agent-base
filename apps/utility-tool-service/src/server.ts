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

// Import client for EXTERNAL tools
import {
    listExternalTools,
    getExternalToolInfo,
    executeExternalTool
} from './clients/externalToolServiceClient.js';

// Import shared response types for consistency
import { ServiceResponse, UtilitiesList, UtilitiesListResponse } from '@agent-base/agents';
import { UtilityInfo  } from '@agent-base/agents';

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

// Centralized Error Handler
const handleServiceError = (res: Response, error: any, prefix: string) => {
    console.error(`❌ ${prefix} Error:`, error);
    const statusCode = error.statusCode || 500; // Use status code if available
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

// --- Unified Tool Endpoints --- 

// List ALL available utilities (Internal + External)
app.get('/get-list', async (req, res) => {
  const logPrefix = '[GET /get-list]';
  console.log(`📚 ${logPrefix} Request received from ${req.ip}`);
  try {
    // Get internal tools
    const internalTools: UtilitiesList = registry.listInternalUtilities(); // Returns { id, description, schema: Record<string, UtilityToolSchema> }
    
    // Get external tools - MODIFY LATER TO INCLUDE SCHEMA
    let externalTools: UtilitiesList; // Expect { id, description, schema: Record<string, ExternalUtilityParamSchema> }
    const externalResponse: UtilitiesListResponse = await listExternalTools();
    if (externalResponse.success) {
        // Assume externalTools response will include schema after we modify client/EUTS
        // For now, map and potentially add placeholder schema
        externalTools = externalResponse.data; 
    } else {
        console.warn(`${logPrefix} Failed to fetch external tools: ${externalResponse.error}`);
    }

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

// Keep legacy endpoint for internal use (optional, points to new unified logic)
app.get('/utilities', (req, res) => {
  console.log(`📚 [GET /utilities - LEGACY] Request received from ${req.ip} - Redirecting to /get-list logic`);
  res.redirect(301, '/get-list'); // Or duplicate logic if redirect isn't desired
});

// Get info about a specific utility (Internal or External)
app.get('/get-details/:id', async (req, res) => {
  const { id } = req.params;
  const logPrefix = `[GET /get-details/${id}]`;
  console.log(`📚 ${logPrefix} Request received from ${req.ip}`);
  
  try {
    // 1. Try internal registry
    const internalUtility = registry.getInternalUtility(id);
    if (internalUtility) {
        console.log(`${logPrefix} Found internal utility.`);
        const responseData: ServiceResponse<UtilityInfo> = {
            success: true,
            data: internalUtility
        };
        return res.status(200).json(responseData);
    }

    // 2. Try external service
    console.log(`${logPrefix} Internal utility not found, checking external service.`);
    const externalResponse = await getExternalToolInfo(id); // Expects { id, description, schema: Record<string, ExternalUtilityParamSchema> }

    if (externalResponse.success) {
        console.log(`${logPrefix} Found external utility.`);
        // Ensure the data matches UtilityInfo (it should if client/EUTS are correct)
        const responseData: ServiceResponse<UtilityInfo> = {
            success: externalResponse.success,
            data: externalResponse.data
        };
        return res.status(200).json(responseData); 
    } else {
        // Check if the error indicates specifically 'not found' vs. other errors
        if (externalResponse.error?.toLowerCase().includes('not found') || externalResponse.error?.includes('404')) {
             console.log(`${logPrefix} Utility not found in external service either.`);
             return res.status(404).json({ 
                success: false,
                error: `Utility with ID '${id}' not found anywhere.`
             });
        } else {
            // Different error from EUTS (e.g., service down, config error)
            console.error(`${logPrefix} Error fetching external utility info: ${externalResponse.error}`);
            // Forward the error details, but use 502 (Bad Gateway) to indicate issue with downstream service
            return res.status(502).json({
                success: false,
                error: `Failed to get details for external utility '${id}'`,
                details: externalResponse.error
            });
        }
    }
  } catch (error) {
      handleServiceError(res, error, logPrefix);
  }
});

// Execute a utility (Internal or External)
app.post('/call-tool/:id', async (req, res) => {
  const { id } = req.params;
  const { input, conversation_id, user_id } = req.body;
  const agent_id = req.headers['x-agent-id'] as string | undefined;
  const logPrefix = `[POST /call-tool/${id}]`;

  console.log(`⚙️ ${logPrefix} Request received from ${req.ip}`);
  if (agent_id) {
    console.log(`⚙️ ${logPrefix} Request made by agent: ${agent_id}`);
  }
  
  // Basic input validation
  if (!conversation_id) {
    return res.status(400).json({ success: false, error: 'conversation_id is required' });
  }
  if (!user_id) {
    return res.status(400).json({ success: false, error: 'user_id is required' });
  }
  
  try {
    // 1. Try internal registry
    const internalUtility = registry.getInternalUtility(id);
    if (internalUtility) {
        console.log(`${logPrefix} Executing internal utility.`);
        const result = await registry.executeInternalUtility(id, user_id, conversation_id, input, agent_id);
        
        // Check if result is already in a standard format (e.g., error or setupNeeded)
        if (result && (result.success === false || result.data?.needs_setup === true)) {
            return res.status(200).json(result); // Return as is (might contain error/setup info)
        } else {
            // Wrap successful internal result
            return res.status(200).json({ success: true, data: result });
        }
    }

    // 2. Try external service
    console.log(`${logPrefix} Internal utility not found, calling external service.`);
    const payload = { userId: user_id, conversationId: conversation_id, params: input, agentId: agent_id };
    const externalResponse = await executeExternalTool(id, payload);

    // Proxy the ServiceResponse directly from the external service
    // This handles success, setupNeeded, and errors reported BY the external service
    if (externalResponse.success) {
        console.log(`${logPrefix} External execution reported success (might include setupNeeded).`);
        return res.status(200).json(externalResponse);
    } else {
        // Check if the error was simply tool-not-found on EUTS, or a communication failure
         if (externalResponse.error?.toLowerCase().includes('not found') || externalResponse.error?.includes('404')) {
             console.log(`${logPrefix} External tool execution failed: Tool not found on EUTS.`);
             return res.status(404).json({ 
                success: false,
                error: `Utility with ID '${id}' not found anywhere.`
             });
         } else {
             // Communication failure or other error reported by the client/EUTS
             console.error(`${logPrefix} External execution failed: ${externalResponse.error}`);
             return res.status(502).json(externalResponse); // Proxy the error response (Bad Gateway)
         }
    }

  } catch (error) {
    // Catch errors thrown by internal execution or client calls
    handleServiceError(res, error, logPrefix);
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`🛠️ [UTILITY SERVICE] Utility Service running on port ${PORT}`);
  console.log(`🌐 [UTILITY SERVICE] Environment: ${nodeEnv}`);
  console.log(`📦 [UTILITY SERVICE] Available utilities: ${registry.getInternalUtilityIds().join(', ')}`);
});

export default app; 