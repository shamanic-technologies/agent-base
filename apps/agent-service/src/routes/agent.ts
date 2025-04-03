/**
 * Agent routes
 * 
 * Endpoints for agent management - creates, lists, and updates agents via database service
 */
import { Router, Request, Response, NextFunction } from 'express';
import axios from 'axios';
import {
  // Keep types needed for /create, /update, /list
  CreateUserAgentInput,
  UpdateUserAgentInput,
  UpdateUserAgentResponse,
  CreateUserAgentResponse,
  ListUserAgentsResponse
} from '@agent-base/agents';
// Removed AI SDK imports
// Removed Service function imports for /run
// Removed Tool Creator Imports

// Removed local Message interface

const router = Router();
const DATABASE_SERVICE_URL = process.env.DATABASE_SERVICE_URL || 'http://localhost:3006';

/**
 * Create a new agent endpoint
 * Renamed from /create
 */
router.post('/create-user-agent', async (req: Request, res: Response, next: NextFunction) => { // Renamed path
  try {
    const agentInput = req.body; // Get all agent data from body
    const userId = (req as any).user?.id as string; // User ID from auth middleware

    // Validate user ID presence (from auth)
    if (!userId) {
        res.status(401).json({ success: false, error: 'User authentication required' });
        return;
    }

    // Validate required agent fields
    if (!agentInput.agent_first_name || !agentInput.agent_last_name || !agentInput.agent_profile_picture || 
        !agentInput.agent_gender || !agentInput.agent_system_prompt || !agentInput.agent_model_id || 
        !agentInput.agent_memory || !agentInput.agent_job_title) {
      res.status(400).json({ success: false, error: 'Missing required agent fields' });
      return;
    }

    // Prepare combined input using the correct type
    const combinedInput: CreateUserAgentInput = {
      ...agentInput,
      user_id: userId // Add user_id to the payload
    };

    // Call database service's new endpoint
    console.log(`[Agent Service /create-user-agent] Calling DB service /agents/create-user-agent for user ${userId}`);
    const response = await axios.post<CreateUserAgentResponse>(
      `${DATABASE_SERVICE_URL}/agents/create-user-agent`, 
      combinedInput 
    );

    // No need for separate linking step anymore
    // ... (Removed axios call to /agents/link) ...

    res.status(response.status).json(response.data);
    
  } catch (error) {
    console.error('[Agent Service] Error creating user agent:', error);
    // Pass error to Express error handler
    next(error); 
  }
});

/**
 * Update an existing agent endpoint
 * Renamed from /update
 */
router.post('/update-user-agent', async (req: Request, res: Response, next: NextFunction) => { // Renamed path
  try {
    const agentUpdateData = req.body; // Agent update data from body
    const userId = (req as any).user?.id as string; // User ID from auth middleware

    // Validate user ID presence (from auth)
    if (!userId) {
        res.status(401).json({ success: false, error: 'User authentication required' });
        return;
    }

    // Validate agent_id is provided in the update data
    if (!agentUpdateData.agent_id) {
      res.status(400).json({ success: false, error: 'agent_id is required in request body' });
      return;
    }

    // Prepare combined input for the new endpoint
    const combinedInput: UpdateUserAgentInput = {
      ...agentUpdateData,
      user_id: userId // Add user_id to the payload
    };

    // Call database service's new endpoint
    console.log(`[Agent Service /update-user-agent] Calling DB service /agents/update-user-agent for user ${userId}, agent ${agentUpdateData.agent_id}`);
    // Use the renamed response type here
    const response = await axios.post<UpdateUserAgentResponse>( 
      `${DATABASE_SERVICE_URL}/agents/update-user-agent`, // Use the new endpoint
      combinedInput // Send combined input including user_id
    );

    res.status(response.status).json(response.data);

  } catch (error) {
    console.error('[Agent Service] Error updating user agent:', error);
    // Pass error to Express error handler
    next(error);
  }
});

/**
 * List agents for a user endpoint
 */
router.get('/list-user-agents', async (req: Request, res: Response, next: NextFunction) => { // Added next
  try {
    // Extract user ID from auth middleware
    const userId = (req as any).user?.id as string;
    
    if (!userId) {
      res.status(401).json({ success: false, error: 'User authentication required' });
      return;
    }

    // Call database service to list agents for user
    console.log(`[Agent Service /list-user-agents] Calling DB service /agents/list-user-agents for user ${userId}`);
    const response = await axios.get<ListUserAgentsResponse>(
      `${DATABASE_SERVICE_URL}/agents/list-user-agents`, { 
        params: { user_id: userId }
      }
    );

    res.status(response.status).json(response.data);

  } catch (error) {
    console.error('[Agent Service] Error listing agents:', error);
    // Pass error to Express error handler
    next(error);
  }
});

// Removed /run endpoint logic

export default router; 