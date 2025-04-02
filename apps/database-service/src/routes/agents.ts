/**
 * Agents Routes
 * 
 * API endpoints for managing agents
 */
import express, { RequestHandler } from 'express';
import { createAgent, updateAgent, linkAgentToUser } from '../services/agents';
import { CreateAgentInput, UpdateAgentInput, LinkAgentInput } from '@agent-base/agents';

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

export default router;