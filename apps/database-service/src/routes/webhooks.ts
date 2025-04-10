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
  createWebhookEvent,
  getUsersByWebsiteId,
} from '../services/webhooks.js';
import { 
  BaseResponse, 
  WebhookEventPayload,
  WebhookResponse
} from '@agent-base/agents';

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
    const { webhook_provider_id, user_id, webhook_credentials } = req.body;
    console.log('webhook_credentials', JSON.stringify(webhook_credentials, null, 2));
    // Validate required parameters.
    if (!webhook_provider_id || !user_id) {
      res.status(400).json({
        success: false,
        error: 'webhook_provider_id and user_id are required'
      } as WebhookResponse);
      return;
    }
    
    // Call the service function to create or update the webhook.
    // Errors from the service will be caught by the catch block.
    await createWebhook(webhook_provider_id, user_id, webhook_credentials);
    
    // Send a success response.
    res.status(200).json({
      success: true,
      data: {
        webhook_provider_id,
        user_id,
        webhook_credentials: webhook_credentials
      }
    } as WebhookResponse);

  } catch (error) {
    // Log the error for server-side debugging.
    console.error('Error in POST /webhooks route:', error);
    // Send a generic 500 internal server error response.
    res.status(500).json({
      success: false,
      error: 'Failed to create or update webhook',
      details: error instanceof Error ? error.message : 'Unknown internal server error' 
    } as WebhookResponse);
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
        error: 'agent_id, webhook_provider_id, and user_id are required'
      } as WebhookResponse);
      return;
    }
    
    // Check if this agent is already mapped to this webhook provider for the user.
    const existingAgentId = await getAgentForWebhook(webhook_provider_id, user_id);
    
    // If the agent is already mapped, return a 200 OK response indicating no change needed.
    if (existingAgentId === agent_id) {
      res.status(200).json({
        success: true,
        message: `Agent ${agent_id} is already mapped to ${webhook_provider_id} webhook for user ${user_id}`
      } as WebhookResponse);
      return;
    }
    
    // Call the service function to map the agent to the webhook.
    // This service function handles ensuring the webhook exists.
    await mapAgentToWebhook(agent_id, webhook_provider_id, user_id);
    
    // Respond with 201 Created status for a successful mapping.
    res.status(201).json({
      success: true,
      message: `Agent ${agent_id} mapped to ${webhook_provider_id} webhook for user ${user_id}`,
      data: {
        agent_id,
        webhook_provider_id,
        user_id
      }
    } as WebhookResponse);

  } catch (error) {
    // Log the error.
    console.error('Error in POST /webhooks/map-agent route:', error);
    // Send a generic 500 error response.
    res.status(500).json({
      success: false,
      error: 'Failed to map agent to webhook',
      details: error instanceof Error ? error.message : 'Unknown internal server error'
    } as WebhookResponse);
  }
});

/**
 * @route GET /webhooks/:webhook_provider_id/agent
 * @description Retrieves the agent ID mapped to a specific webhook provider for a user.
 *              Expects webhook_provider_id as a route parameter and user_id as a query parameter.
 * @param {Request} req - Express request object, containing webhook_provider_id in params and user_id in query.
 * @param {Response} res - Express response object.
 */
router.get('/:webhook_provider_id/agent', async (req: Request, res: Response): Promise<void> => {
  try {
    // Extract webhook provider ID from route parameters.
    const { webhook_provider_id } = req.params;
    // Extract user ID from query parameters.
    const user_id = req.query.user_id as string;
    
    // Validate required parameters.
    if (!webhook_provider_id || !user_id) {
      res.status(400).json({
        success: false,
        error: 'webhook_provider_id (in path) and user_id (in query) are required'
      } as WebhookResponse);
      return;
    }
    
    // Call the service function to get the mapped agent ID.
    const agentId = await getAgentForWebhook(webhook_provider_id, user_id);
    
    // If no agent is mapped, return a 404 Not Found response.
    if (!agentId) {
      res.status(404).json({
        success: false,
        error: `No agent mapped to ${webhook_provider_id} webhook for user ${user_id}`
      } as WebhookResponse);
      return;
    }
    
    // Respond with 200 OK and the mapping details.
    res.status(200).json({
      success: true,
      data: {
        agent_id: agentId,
        webhook_provider_id,
        user_id
      }
    } as WebhookResponse);
  } catch (error) {
    // Log the error.
    console.error(`Error in GET /webhooks/:webhook_provider_id/agent route:`, error);
    // Send a generic 500 error response.
    res.status(500).json({
      success: false,
      error: 'Failed to get agent for webhook',
      details: error instanceof Error ? error.message : 'Unknown internal server error'
    } as WebhookResponse);
  }
});

/**
 * @route POST /webhooks/events
 * @description Creates a new webhook event for a provider and user
 *              Expects webhook_provider_id, user_id, and webhook_event_data in the request body.
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 */
router.post('/events', async (req: Request, res: Response): Promise<void> => {
  try {
    // Extract parameters from the request body
    const { webhook_provider_id, user_id, webhook_event_payload } = req.body;
    
    // Validate required parameters
    if (!webhook_provider_id || !user_id || !webhook_event_payload) {
      res.status(400).json({
        success: false,
        error: 'webhook_provider_id, user_id, and webhook_event_payload are required'
      } as WebhookResponse);
      return;
    }
    
    // No strict validation on webhook_event_data structure
    // This allows for different webhook providers to have different event structures
    
    // Call the service function to create the webhook event
    await createWebhookEvent(webhook_provider_id, user_id, webhook_event_payload as WebhookEventPayload);
    
    // Respond with success 
    res.status(201).json({
      success: true,
      message: `Webhook event created for ${webhook_provider_id} and user ${user_id}`
    } as WebhookResponse);
  } catch (error) {
    // Log the error
    console.error('Error in POST /webhooks/events route:', error);
    // Send error response
    res.status(500).json({
      success: false,
      error: 'Failed to create webhook event',
      details: error instanceof Error ? error.message : 'Unknown internal server error'
    } as WebhookResponse);
  }
});

/**
 * @route GET /webhooks/crisp/users/:website_id
 * @description Retrieves all user IDs associated with a specific Crisp website ID
 * @param {Request} req - Express request object with website_id as a route parameter
 * @param {Response} res - Express response object
 */
router.get('/crisp/users/:website_id', async (req: Request, res: Response): Promise<void> => {
  try {
    // Extract website_id from route parameters
    const { website_id } = req.params;
    
    // Validate required parameter
    if (!website_id) {
      res.status(400).json({
        success: false,
        error: 'website_id is required'
      } as WebhookResponse);
      return;
    }
    
    // Call the service function to get user IDs associated with this website ID
    const userIds = await getUsersByWebsiteId('crisp', website_id);
    
    // If no users are found, return a 404 Not Found response
    if (userIds.length === 0) {
      res.status(404).json({
        success: false,
        error: `No users found for Crisp website ID: ${website_id}`
      } as WebhookResponse);
      return;
    }
    
    // Respond with 200 OK and the user IDs
    res.status(200).json({
      success: true,
      data: {
        website_id,
        user_ids: userIds
      }
    } as WebhookResponse);
  } catch (error) {
    // Log the error
    console.error(`Error in GET /webhooks/crisp/users/:website_id route:`, error);
    // Send a generic 500 error response
    res.status(500).json({
      success: false,
      error: 'Failed to get users for website ID',
      details: error instanceof Error ? error.message : 'Unknown internal server error'
    } as WebhookResponse);
  }
});

export default router; 