/**
 * Agent routes
 * 
 * Endpoints for agent management - creates, lists, and updates agents via database service
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import axios from 'axios';
import {
  CreateAgentInput,
  UpdateAgentInput,
  ListUserAgentsInput,
  CreateAgentResponse,
  UpdateAgentResponse,
  ListUserAgentsResponse,
  Agent
} from '@agent-base/agents';

const router = Router();
const DATABASE_SERVICE_URL = process.env.DATABASE_SERVICE_URL || 'http://localhost:3002';

/**
 * Create a new agent endpoint
 * Accepts agent details and forwards request to database service
 */
router.post('/create', async (req: Request, res: Response) => {
  try {
    const input: CreateAgentInput = req.body;
    
    // Extract user ID from auth middleware
    const userId = (req as any).user?.id as string;

    // Validate required fields
    if (!input.agent_first_name || !input.agent_last_name || !input.agent_profile_picture || 
        !input.agent_gender || !input.agent_system_prompt || !input.agent_model_id || 
        !input.agent_memory || !input.agent_job_title) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
      return;
    }

    // Call database service to create agent
    const response = await axios.post<CreateAgentResponse>(
      `${DATABASE_SERVICE_URL}/agents/create`,
      input
    );

    // If agent created successfully, link it to the user
    if (response.data.success && response.data.data && userId) {
      // Link agent to user
      await axios.post(`${DATABASE_SERVICE_URL}/agents/link`, {
        user_id: userId,
        agent_id: response.data.data.agent_id
      });
    }

    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('[Agent Service] Error creating agent:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * Update an existing agent endpoint
 * Accepts agent updates and forwards request to database service
 */
router.post('/update', async (req: Request, res: Response) => {
  try {
    const input: UpdateAgentInput = req.body;
    
    // Validate agent_id is provided
    if (!input.agent_id) {
      res.status(400).json({
        success: false,
        error: 'agent_id is required'
      });
      return;
    }

    // Call database service to update agent
    const response = await axios.post<UpdateAgentResponse>(
      `${DATABASE_SERVICE_URL}/agents/update`,
      input
    );

    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('[Agent Service] Error updating agent:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * List agents for a user endpoint
 * Gets all agents associated with the authenticated user
 */
router.get('/list', async (req: Request, res: Response) => {
  try {
    // Extract user ID from auth middleware
    const userId = (req as any).user?.id as string;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
      return;
    }

    // Call database service to list agents for user
    const response = await axios.get<ListUserAgentsResponse>(
      `${DATABASE_SERVICE_URL}/agents/list`, {
        params: { user_id: userId }
      }
    );

    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('[Agent Service] Error listing agents:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

export default router; 