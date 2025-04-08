/**
 * Agent routes
 * 
 * Endpoints for agent management - creates, lists, and updates agents via database service
 */
import { Router, Request, Response, NextFunction } from 'express';
// Remove axios import - no longer needed here
// import axios from 'axios'; 
import {
  // Keep types needed for validation and payload creation
  CreateUserAgentInput,
  UpdateUserAgentInput,
  // Response types might not be directly needed if service returns specific data structure
  // UpdateUserAgentResponse, 
  // CreateUserAgentResponse, 
  ListUserAgentsResponse, // Keep for formatting the final response in get-or-create
  // GetUserAgentResponse
  AgentRecord // Keep for default agent creation typing
} from '@agent-base/agents';

// Import service functions
import {
  createUserAgent,
  updateUserAgent,
  listUserAgents,
  getUserAgent
} from '../services/agentServiceDb.js';

// Import the new utility function
import { createDefaultAgentPayload } from '../lib/utils/agentUtils.js';

// Import ServiceResponse type if needed for clarity, though inference might work
import { ServiceResponse } from '../types/index.js';

const router = Router();
// Remove DATABASE_SERVICE_URL - no longer needed here
// const DATABASE_SERVICE_URL = process.env.DATABASE_SERVICE_URL || 'http://localhost:3006';

/**
 * Create a new agent endpoint
 */
router.post('/create-user-agent', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const agentInput = req.body;
    const userId = (req as any).user?.id as string;

    if (!userId) {
        res.status(401).json({ success: false, error: 'User authentication required' });
        return;
    }

    // Basic validation (keep as before)
    if (!agentInput.agent_first_name || !agentInput.agent_last_name || !agentInput.agent_profile_picture || 
        !agentInput.agent_gender || !agentInput.agent_model_id || 
        !agentInput.agent_memory || !agentInput.agent_job_title) {
      res.status(400).json({ success: false, error: 'Missing required agent fields' });
      return;
    }

    const combinedInput: CreateUserAgentInput = {
      ...agentInput,
      user_id: userId
    };

    console.log(`[Agent Service /create-user-agent] Calling createUserAgent service for user ${userId}`);
    // Call the service function
    const result = await createUserAgent(combinedInput);

    if (result.success && result.data) {
      // Send 201 Created on success
      res.status(201).json(result); 
    } else {
      // Handle service failure - Send 500 Internal Server Error
      console.error(`[Agent Service /create-user-agent] Service call failed: ${result.error}`);
      res.status(500).json({ success: false, error: result.error || 'Failed to create agent via database service' });
    }
    
  } catch (error) {
    console.error('[Agent Service /create-user-agent] Unexpected error:', error);
    next(error); // Pass to generic error handler
  }
});

/**
 * Update an existing agent endpoint
 */
router.post('/update-user-agent', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const agentUpdateData = req.body;
    const userId = (req as any).user?.id as string;

    if (!userId) {
        res.status(401).json({ success: false, error: 'User authentication required' });
        return;
    }

    if (!agentUpdateData.agent_id) {
      res.status(400).json({ success: false, error: 'agent_id is required in request body' });
      return;
    }

    const combinedInput: UpdateUserAgentInput = {
      ...agentUpdateData,
      user_id: userId
    };

    console.log(`[Agent Service /update-user-agent] Calling updateUserAgent service for user ${userId}, agent ${agentUpdateData.agent_id}`);
    // Call the service function
    const result = await updateUserAgent(combinedInput);

    if (result.success && result.data) {
      // Send 200 OK on success
      res.status(200).json(result); 
    } else {
      // Handle service failure - Send 500 Internal Server Error
      console.error(`[Agent Service /update-user-agent] Service call failed: ${result.error}`);
      // Potentially check error message for specific DB service codes (like 403/404) if needed
      res.status(500).json({ success: false, error: result.error || 'Failed to update agent via database service' });
    }

  } catch (error) {
    console.error('[Agent Service /update-user-agent] Unexpected error:', error);
    next(error);
  }
});

/**
 * Gets the list of agents for a user.
 * If the user has no agents, creates a default agent and returns it.
 */
router.get('/get-or-create-user-agents', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const userId = (req as any).user?.id as string;

  if (!userId) {
    console.error('[Agent Service /get-or-create-user-agents] User ID not found in request.');
    res.status(401).json({ success: false, error: 'User authentication required' });
    return;
  }

  const logPrefix = `[Agent Service /get-or-create-user-agents] User ${userId}:`;

  try {
    // Step 1: Try to list existing agents using the service function
    console.log(`${logPrefix} Calling listUserAgents service`);
    const listResult: ServiceResponse<AgentRecord[]> = await listUserAgents(userId);

    // Check for successful response and if agents exist
    if (listResult.success && listResult.data && listResult.data.length > 0) {
      console.log(`${logPrefix} Found ${listResult.data.length} existing agents. Returning list.`);
      res.status(200).json(listResult);
      return;
    } else if (!listResult.success) {
       console.error(`${logPrefix} Error listing agents from service:`, listResult.error);
       res.status(500).json({ success: false, error: listResult.error || 'Failed to list agents' });
       return;
    }
    
    // Step 2: No agents found, create default using the utility function
    console.log(`${logPrefix} No existing agents found. Creating default agent via service.`);
    const defaultAgentPayload = createDefaultAgentPayload(userId);
    
    // Call the createUserAgent service function
    const createResult = await createUserAgent(defaultAgentPayload);

    if (createResult.success && createResult.data) {
      console.log(`${logPrefix} Default agent created successfully (Agent ID: ${createResult.data.agent_id}).`);
      res.status(201).json({
        success: true,
        data: [createResult.data] // Wrap single agent in array
      } as ListUserAgentsResponse);
      return;
    } else {
      console.error(`${logPrefix} Failed to create default agent via service:`, createResult.error);
      res.status(500).json({ success: false, error: createResult.error || 'Failed to create default agent' });
       return;
    }

  } catch (error: any) {
    console.error(`${logPrefix} Unexpected error in route handler:`, error);
    next(error);
  }
});

/**
 * Get a specific agent for a user endpoint
 */
router.get('/get-user-agent', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.id as string;
    const agentId = req.query.agent_id as string;
    
    if (!userId) {
      res.status(401).json({ success: false, error: 'User authentication required' });
      return;
    }
    if (!agentId) {
      res.status(400).json({ success: false, error: 'agent_id query parameter is required' });
      return;
    }

    console.log(`[Agent Service /get-user-agent] Calling getUserAgent service for user ${userId}, agent ${agentId}`);
    // Call the service function
    const result = await getUserAgent(userId, agentId);

    if (result.success && result.data) {
      // Send 200 OK on success
      res.status(200).json(result);
    } else {
      // Handle service failure - Send 500 or potentially 404 if error indicates not found
      console.error(`[Agent Service /get-user-agent] Service call failed: ${result.error}`);
      
      // Check if error is a string before calling toLowerCase
      const isNotFoundError = typeof result.error === 'string' && result.error.toLowerCase().includes('not found');
      const statusCode = isNotFoundError ? 404 : 500;
      
      // Construct error message safely
      const errorMessage = typeof result.error === 'string' ? result.error : 'Failed to get agent via database service';
      
      res.status(statusCode).json({ success: false, error: errorMessage });
    }

  } catch (error) {
    console.error('[Agent Service /get-user-agent] Unexpected error:', error);
    next(error);
  }
});

export default router; 