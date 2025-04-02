/**
 * Agents Routes
 * 
 * API endpoints for managing agents
 */
import express, { Request, Response, RequestHandler } from 'express';
import { createAgent, updateAgent, linkAgentToUser, listUserAgents, getUserAgent } from '../services/agents.js';
import { CreateAgentInput, UpdateAgentInput, LinkAgentInput, ListUserAgentsInput, GetUserAgentInput } from '@agent-base/agents';

const router = express.Router();

/**
 * Create a new agent
 */
router.post('/create', (async (req, res) => {
  try {
    const input: CreateAgentInput = req.body;
    
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

    const result = await createAgent(input);
    
    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.status(201).json(result);
  } catch (error) {
    console.error('Error in create agent route:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}) as RequestHandler);

/**
 * Update an existing agent
 */
router.post('/update', (async (req, res) => {
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

    const result = await updateAgent(input);
    
    if (!result.success) {
      res.status(404).json(result);
      return;
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in update agent route:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}) as RequestHandler);

/**
 * Link an agent to a user
 */
router.post('/link', (async (req, res) => {
  try {
    const input: LinkAgentInput = req.body;
    
    // Validate required fields
    if (!input.user_id || !input.agent_id) {
      res.status(400).json({
        success: false,
        error: 'user_id and agent_id are required'
      });
      return;
    }

    const result = await linkAgentToUser(input);
    
    if (!result.success) {
      res.status(404).json(result);
      return;
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in link agent route:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}) as RequestHandler);

/**
 * List all agents for a user
 */
router.get('/list', (async (req, res) => {
  try {
    // Extract user_id from query parameters
    const user_id = req.query.user_id as string;
    
    // Validate user_id is provided
    if (!user_id) {
      res.status(400).json({
        success: false,
        error: 'user_id query parameter is required'
      });
      return;
    }

    const input: ListUserAgentsInput = { user_id };
    const result = await listUserAgents(input);
    
    if (!result.success) {
      res.status(404).json(result);
      return;
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in list agents route:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}) as RequestHandler);

/**
 * Get a specific agent belonging to a user
 */
// @ts-ignore - Suppress persistent RequestHandler type mismatch error for this route
router.get('/get-user-agent', (async (req, res) => {
  try {
    // Extract user_id and agent_id from query parameters
    const user_id = req.query.user_id as string;
    const agent_id = req.query.agent_id as string;

    // Validate required query parameters
    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'user_id query parameter is required'
      });
    }
    if (!agent_id) {
      return res.status(400).json({
        success: false,
        error: 'agent_id query parameter is required'
      });
    }

    console.log(`[Database Service /get-user-agent] Request for user: ${user_id}, agent: ${agent_id}`);

    const input: GetUserAgentInput = { user_id, agent_id };
    // Call the service function to fetch the agent
    const result = await getUserAgent(input);
    
    // If agent not found or doesn't belong to user, service should return success: false
    if (!result.success) {
      console.log(`[Database Service /get-user-agent] Agent not found or access denied for user: ${user_id}, agent: ${agent_id}`);
      return res.status(404).json(result); // Return 404
    }

    console.log(`[Database Service /get-user-agent] Found agent: ${agent_id} for user: ${user_id}`);
    res.status(200).json(result); // Return agent data

  } catch (error) {
    console.error('Error in get user agent route:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown internal server error'
    });
  }
}) as RequestHandler);

export default router;