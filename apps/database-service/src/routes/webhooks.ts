/**
 * Webhook Routes
 * 
 * API endpoints for managing webhook integrations and mappings
 */
import { Router, Request, Response } from 'express';
import { 
  createWebhook, 
  getAgentForWebhook, 
  mapAgentToWebhook, 
  unmapAgentFromWebhook 
} from '../services/webhooks.js';

const router = Router();

/**
 * Create or update webhook registration
 * POST /webhooks
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { webhook_id, user_id, webhook_data } = req.body;
    
    if (!webhook_id || !user_id) {
      res.status(400).json({
        success: false,
        error: 'webhook_id and user_id are required'
      });
      return;
    }
    
    const success = await createWebhook(webhook_id, user_id, webhook_data || {});
    
    if (success) {
      res.status(200).json({
        success: true,
        data: {
          webhook_id,
          user_id,
          webhook_data: webhook_data || {}
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to create or update webhook'
      });
    }
  } catch (error) {
    console.error('Error in POST /webhooks route:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Map agent to webhook
 * POST /webhooks/map-agent
 */
router.post('/map-agent', async (req: Request, res: Response): Promise<void> => {
  try {
    const { agent_id, webhook_id, user_id } = req.body;
    
    if (!agent_id || !webhook_id || !user_id) {
      res.status(400).json({
        success: false,
        error: 'agent_id, webhook_id, and user_id are required'
      });
      return;
    }
    
    // Get current agent mapped to webhook if any
    const existingAgentId = await getAgentForWebhook(webhook_id, user_id);
    
    if (existingAgentId === agent_id) {
      res.status(200).json({
        success: true,
        message: `Agent ${agent_id} is already mapped to ${webhook_id} webhook for user ${user_id}`
      });
      return;
    }
    
    // Map agent to webhook (this will handle creating webhook if needed)
    const success = await mapAgentToWebhook(agent_id, webhook_id, user_id);
    
    if (success) {
      res.status(201).json({
        success: true,
        message: `Agent ${agent_id} mapped to ${webhook_id} webhook for user ${user_id}`,
        data: {
          agent_id,
          webhook_id,
          user_id
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to map agent to webhook'
      });
    }
  } catch (error) {
    console.error('Error in POST /webhooks/map-agent route:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Unmap agent from webhook
 * POST /webhooks/unmap-agent
 */
router.post('/unmap-agent', async (req: Request, res: Response): Promise<void> => {
  try {
    const { agent_id, webhook_id, user_id } = req.body;
    
    if (!webhook_id || !user_id) {
      res.status(400).json({
        success: false,
        error: 'webhook_id and user_id are required'
      });
      return;
    }
    
    // Get current agent mapped to webhook if any
    const existingAgentId = await getAgentForWebhook(webhook_id, user_id);
    
    if (!existingAgentId) {
      res.status(404).json({
        success: false,
        error: `No agent is mapped to ${webhook_id} webhook for user ${user_id}`
      });
      return;
    }
    
    if (agent_id && existingAgentId !== agent_id) {
      res.status(400).json({
        success: false,
        error: `Agent ${agent_id} is not mapped to ${webhook_id} webhook for user ${user_id}`
      });
      return;
    }
    
    // Unmap agent from webhook
    const success = await unmapAgentFromWebhook(webhook_id, user_id);
    
    if (success) {
      res.status(200).json({
        success: true,
        message: `Agent unmapped from ${webhook_id} webhook for user ${user_id}`
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to unmap agent from webhook'
      });
    }
  } catch (error) {
    console.error('Error in POST /webhooks/unmap-agent route:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get agent for webhook
 * GET /webhooks/:webhook_id/agent
 */
router.get('/:webhook_id/agent', async (req: Request, res: Response): Promise<void> => {
  try {
    const { webhook_id } = req.params;
    const user_id = req.query.user_id as string;
    
    if (!webhook_id || !user_id) {
      res.status(400).json({
        success: false,
        error: 'webhook_id and user_id are required'
      });
      return;
    }
    
    const agentId = await getAgentForWebhook(webhook_id, user_id);
    
    if (!agentId) {
      res.status(404).json({
        success: false,
        error: `No agent mapped to ${webhook_id} webhook for user ${user_id}`
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      data: {
        agent_id: agentId,
        webhook_id,
        user_id
      }
    });
  } catch (error) {
    console.error(`Error in GET /webhooks/:webhook_id/agent route:`, error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 