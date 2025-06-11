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
  CreateClientUserAgentInput,
  UpdateAgentInput,
  // Response types might not be directly needed if service returns specific data structure
  // UpdateUserAgentResponse, 
  // CreateUserAgentResponse, 
  // GetUserAgentResponse
  AgentRecord,
  GetClientUserAgentInput,
  Agent,
  ServiceResponse,
  UpdateClientUserAgentInput,
  Gender, // Keep for default agent creation typing
  // Remove ServiceResponse import - Use specific response types like UserResponse etc.
  // ServiceResponse 
} from '@agent-base/types';

// Import service functions
import {
  createUserAgent,
  updateUserAgent,
  listUserAgents,
  getUserAgentApiClient
} from '@agent-base/api-client';

// Import the new utility function
import { createDefaultAgentPayload } from '../lib/utils/agentUtils.js';

const router = Router();
// Remove DATABASE_SERVICE_URL - no longer needed here
// const DATABASE_SERVICE_URL = process.env.DATABASE_SERVICE_URL || 'http://localhost:3006';

/**
 * Create a new agent endpoint
 */
router.post('/create-user-agent', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const agentInput: CreateClientUserAgentInput = req.body;
    // Log the received body
    
    // Extract auth details from augmented request
    const clientUserId = req.clientUserId as string;
    const clientOrganizationId = req.clientOrganizationId as string;
    const platformUserId = req.platformUserId as string;
    const platformApiKey = req.headers['x-platform-api-key'] as string;

    // Validate auth details first
    if (!clientUserId || !clientOrganizationId || !platformUserId || !platformApiKey) {
        res.status(401).json({ success: false, error: 'Authentication details missing from request headers/context' });
        return;
    }

    // Basic validation (keep as before)
    if (!agentInput.firstName || !agentInput.lastName || !agentInput.profilePicture || 
        !agentInput.gender || !agentInput.modelId || 
        !agentInput.memory || !agentInput.jobTitle) {
      // Log if validation fails
      console.error('[Agent Service /create-user-agent] Validation Failed! Body:', JSON.stringify(agentInput, null, 2));
      res.status(400).json({ success: false, error: 'Missing required agent fields' });
      return;
    }

    // We no longer combine user_id into the input here, it's passed separately
    const combinedInput: CreateClientUserAgentInput = {
      ...agentInput,
      clientUserId,
      clientOrganizationId
    };

    // Call the service function with all required arguments
    const result = await createUserAgent(
      combinedInput, // Pass the combined input
      platformUserId,
      platformApiKey,
      clientUserId,
      clientOrganizationId
    );

    if (result.success) {
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
    const agentUpdateData: UpdateClientUserAgentInput = req.body;
    // Extract auth details from augmented request
    const clientUserId = req.clientUserId as string;
    const clientOrganizationId = req.clientOrganizationId as string;
    const platformUserId = req.platformUserId as string;
    const platformApiKey = req.headers['x-platform-api-key'] as string;

    // Validate auth details first
    if (!clientUserId || !clientOrganizationId || !platformUserId || !platformApiKey) {
        res.status(401).json({ success: false, error: 'Authentication details missing from request headers/context' });
        return;
    }

    if (!agentUpdateData.agentId) {
      res.status(400).json({ success: false, error: 'agentId is required in request body' });
      return;
    }

    // Call the service function with all required arguments
    const updateResponse : ServiceResponse<Agent> = await updateUserAgent(
      agentUpdateData, // Pass the original body as data
      platformUserId,
      platformApiKey,
      clientUserId,
      clientOrganizationId
    );

    if (updateResponse.success) {
      // Send 200 OK on success
      res.status(200).json(updateResponse); 
    } else {
      // Handle service failure - Send 500 Internal Server Error
      console.error(`[Agent Service /update-user-agent] Service call failed: ${updateResponse.error}`);
      // Potentially check error message for specific DB service codes (like 403/404) if needed
      res.status(500).json({ success: false, error: updateResponse.error || 'Failed to update agent via database service' });
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
  // Extract auth details from augmented request
  const clientUserId = req.clientUserId as string;
  const clientOrganizationId = req.clientOrganizationId as string;
  const platformUserId = req.platformUserId as string;
  const platformApiKey = req.headers['x-platform-api-key'] as string;

  // Validate auth details first
  if (!clientUserId || !clientOrganizationId || !platformUserId || !platformApiKey) {
      console.error('[Agent Service /get-or-create-user-agents] Authentication details missing from request headers/context.');
      res.status(401).json({ success: false, error: 'Authentication details missing from request headers/context' });
      return;
  }

  const logPrefix = `[Agent Service /get-or-create-user-agents] User ${clientUserId}:`;

  try {
    // Step 1: Try to list existing agents using the service function
    // Pass params object and auth details
    const listResult = await listUserAgents(
      platformUserId,
      platformApiKey,
      clientUserId,
      clientOrganizationId
    );

    // Check for successful response and if agents exist
    if (listResult.success && listResult.data && listResult.data.length > 0) {
      // Return the ListUserAgentsResponse directly
      res.status(200).json(listResult);
      return;
    } else if (!listResult.success) {
       console.error(`${logPrefix} Error listing agents from service:`, listResult.error);
       // Return the error response (already in ListUserAgentsResponse format)
       res.status(500).json(listResult);
       return;
    }
    
    // Step 2: No agents found, create default using the utility function
    // Pass clientUserId to the utility function as required
    const defaultAgentPayload = createDefaultAgentPayload(clientUserId, clientOrganizationId); 
    
    // Call the createUserAgent service function (returns CreateUserAgentResponse)
    const createResult = await createUserAgent(
      defaultAgentPayload,
      platformUserId,
      platformApiKey,
      clientUserId,
      clientOrganizationId
    );

    if (createResult.success) {
      // Format the response as ListUserAgentsResponse
      res.status(201).json({
        success: true,
        data: [createResult.data] // Wrap single agent in array
      });
      return;
    } else {
      console.error(`${logPrefix} Failed to create default agent via service:`, createResult.error);
       // Return the error response from the service (already CreateUserAgentResponse format)
       // Need to format it as ListUserAgentsResponse for consistency in this endpoint
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
    // Extract auth details and agentId from query
    const clientUserId = req.clientUserId as string;
    const clientOrganizationId = req.clientOrganizationId as string;
    const platformUserId = req.platformUserId as string;
    const platformApiKey = req.headers['x-platform-api-key'] as string;
    const agentId = req.query.agent_id as string;
    
    // Validate auth details first
    if (!clientUserId || !clientOrganizationId || !platformUserId || !platformApiKey) {
        res.status(401).json({ success: false, error: 'Authentication details missing from request headers/context' });
        return;
    }

    if (!agentId) {
      res.status(400).json({ success: false, error: 'agentId query parameter is required' });
      return;
    }

    // Call the service function with params object and auth details
    const result = await getUserAgentApiClient(
      { clientUserId: clientUserId, agentId: agentId }, // Params object
      platformUserId,
      platformApiKey,
      clientUserId,
      clientOrganizationId
    );

    if (result.success) {
      // Send 200 OK with the agent data
      res.status(200).json(result); 
    } else {
      // Handle service failure (e.g., agent not found, DB error)
      console.error(`[Agent Service /get-user-agent] Service call failed: ${result.error}`);
      // Use a 404 if agent not found, 500 otherwise - needs more specific error handling from API client ideally
      const statusCode = result.error.toLowerCase().includes('not found') ? 404 : 500;
      res.status(statusCode).json({ success: false, error: result.error || 'Failed to get agent via database service' });
    }

  } catch (error) {
    console.error('[Agent Service /get-user-agent] Unexpected error:', error);
    next(error);
  }
});

export default router; 