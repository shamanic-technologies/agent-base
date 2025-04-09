/**
 * Webhook Routes
 * 
 * API endpoints for managing webhook provider configurations and their mappings to agents.
 */
import { Router, Request, Response } from 'express';
import { 
  createWebhook, 
  getAgentForWebhook, 
  mapAgentToWebhook, 
} from '../services/webhooks.js';

const router = Router();

/**
 * @route POST /webhooks
 * @description Creates a new webhook configuration for a provider and user, or updates an existing one.
 *              Expects webhook_provider_id and user_id in the request body.
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    // Extract webhook provider ID, user ID, and optional data from the request body.
    const { webhook_provider_id, user_id, webhook_data } = req.body;
    console.log(`[Webhook Service /] Received webhook data: ${webhook_data}`, null, 2);
    // Validate required parameters.
    if (!webhook_provider_id || !user_id) {
      res.status(400).json({
        success: false,
        error: 'webhook_provider_id and user_id are required' // Updated parameter name
      });
      return;
    }
    
    // Call the service function to create or update the webhook.
    // Errors from the service will be caught by the catch block.
    await createWebhook(webhook_provider_id, user_id, webhook_data);
    
    // Send a success response.
    res.status(200).json({
      success: true,
      data: {
        webhook_provider_id, // Updated field name
        user_id,
        webhook_data: webhook_data
      }
    });

  } catch (error) {
    // Log the error for server-side debugging.
    console.error('Error in POST /webhooks route:', error);
    // Send a generic 500 internal server error response.
    res.status(500).json({
      success: false,
      error: 'Failed to create or update webhook', // Generic error for client
      // Optionally include specific error message in development/debug mode
      details: error instanceof Error ? error.message : 'Unknown internal server error' 
    });
  }
});

/**
 * @route POST /webhooks/map-agent
 * @description Maps an agent to a specific webhook provider configuration for a user.
 *              Expects agent_id, webhook_provider_id, and user_id in the request body.
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 */
router.post('/map-agent', async (req: Request, res: Response): Promise<void> => {
  try {
    // Extract parameters from the request body.
    const { agent_id, webhook_provider_id, user_id } = req.body;
    
    // Validate required parameters.
    if (!agent_id || !webhook_provider_id || !user_id) {
      res.status(400).json({
        success: false,
        error: 'agent_id, webhook_provider_id, and user_id are required' // Updated parameter name
      });
      return;
    }
    
    // Check if this agent is already mapped to this webhook provider for the user.
    const existingAgentId = await getAgentForWebhook(webhook_provider_id, user_id);
    
    // If the agent is already mapped, return a 200 OK response indicating no change needed.
    if (existingAgentId === agent_id) {
      res.status(200).json({
        success: true,
        message: `Agent ${agent_id} is already mapped to ${webhook_provider_id} webhook for user ${user_id}` // Updated parameter name
      });
      return;
    }
    
    // Call the service function to map the agent to the webhook.
    // This service function handles ensuring the webhook exists.
    await mapAgentToWebhook(agent_id, webhook_provider_id, user_id);
    
    // Respond with 201 Created status for a successful mapping.
    res.status(201).json({
      success: true,
      message: `Agent ${agent_id} mapped to ${webhook_provider_id} webhook for user ${user_id}`, // Updated parameter name
      data: {
        agent_id,
        webhook_provider_id, // Updated field name
        user_id
      }
    });

  } catch (error) {
    // Log the error.
    console.error('Error in POST /webhooks/map-agent route:', error);
    // Send a generic 500 error response.
    res.status(500).json({
      success: false,
      error: 'Failed to map agent to webhook',
      details: error instanceof Error ? error.message : 'Unknown internal server error'
    });
  }
});

/**
 * @route GET /webhooks/:webhook_provider_id/agent
 * @description Retrieves the agent ID mapped to a specific webhook provider for a user.
 *              Expects webhook_provider_id as a route parameter and user_id as a query parameter.
 * @param {Request} req - Express request object, containing webhook_provider_id in params and user_id in query.
 * @param {Response} res - Express response object.
 */
router.get('/:webhook_provider_id/agent', async (req: Request, res: Response): Promise<void> => { // Updated route parameter
  try {
    // Extract webhook provider ID from route parameters.
    const { webhook_provider_id } = req.params; // Updated parameter name
    // Extract user ID from query parameters.
    const user_id = req.query.user_id as string;
    
    // Validate required parameters.
    if (!webhook_provider_id || !user_id) {
      res.status(400).json({
        success: false,
        error: 'webhook_provider_id (in path) and user_id (in query) are required' // Updated parameter name
      });
      return;
    }
    
    // Call the service function to get the mapped agent ID.
    const agentId = await getAgentForWebhook(webhook_provider_id, user_id);
    
    // If no agent is mapped, return a 404 Not Found response.
    if (!agentId) {
      res.status(404).json({
        success: false,
        error: `No agent mapped to ${webhook_provider_id} webhook for user ${user_id}` // Updated parameter name
      });
      return;
    }
    
    // Respond with 200 OK and the mapping details.
    res.status(200).json({
      success: true,
      data: {
        agent_id: agentId,
        webhook_provider_id, // Updated field name
        user_id
      }
    });
  } catch (error) {
    // Log the error.
    console.error(`Error in GET /webhooks/:webhook_provider_id/agent route:`, error);
    // Send a generic 500 error response.
    res.status(500).json({
      success: false,
      error: 'Failed to get agent for webhook',
      details: error instanceof Error ? error.message : 'Unknown internal server error'
    });
  }
});

export default router; 