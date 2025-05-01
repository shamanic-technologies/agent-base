// /**
//  * Webhook Routes
//  * 
//  * API endpoints for managing webhook provider configurations and their mappings to agents.
//  */
// import { Router, Request, Response } from 'express';
// import { 
//   createWebhook, 
//   getAgentIdForWebhook, 
//   mapAgentToWebhook,
//   createWebhookEvent,
//   getUserIdsByWebsiteId,
// } from '../services/webhooks.js';
// import { 
//   CreateWebhookRequest, 
//   ErrorResponse, 
//   CreateWebhookAgentLinkRequest,
//   GetWebhookAgentLinkRequest,
//   CreateWebhookEventRequest
// } from '@agent-base/types';

// const router = Router();

// /**
//  * @route POST /webhooks
//  * @description Creates a new webhook configuration for a provider and user, or updates an existing one.
//  *              Expects webhook_provider_id and user_id in the request body.
//  * @param {Request} req - Express request object.
//  * @param {Response} res - Express response object.
//  */
// router.post('/', async (req: Request, res: Response): Promise<void> => {
//   try {
//     // Extract webhook provider ID, user ID, and optional data from the request body.
//     const { webhookProviderId } : CreateWebhookRequest = req.body;
//     // Validate required parameters.
//     if (!webhookProviderId) {
//       res.status(400).json({
//         success: false,
//         error: 'webhookProviderId and clientUserId are required'
//       } as ErrorResponse);
//       return;
//     }
    
//     // Call the service function to create or update the webhook.
//     // Errors from the service will be caught by the catch block.
//     const webhookResponse = await createWebhook({ webhookProviderId, clientUserId, webhookCredentials });
//     if (!webhookResponse.success) {
//       res.status(500).json(webhookResponse);
//       return;
//     }
//     // Send a success response.
//     res.status(200).json(webhookResponse);

//   } catch (error) {
//     // Log the error for server-side debugging.
//     console.error('Error in POST /webhooks route:', error);
//     // Send a generic 500 internal server error response.
//     res.status(500).json({
//       success: false,
//       error: 'Failed to create webhook',
//       details: error instanceof Error ? error.message : 'Unknown internal server error'
//     } as ErrorResponse);
//   }
// });

// /**
//  * @route POST /webhooks/map-agent
//  * @description Maps an agent to a specific webhook provider configuration for a user.
//  *              Expects agent_id, webhook_provider_id, and user_id in the request body.
//  * @param {Request} req - Express request object.
//  * @param {Response} res - Express response object.
//  */
// router.post('/map-agent', async (req: Request, res: Response): Promise<void> => {
//   try {
//     // Extract parameters from the request body.
//     const { agentId, webhookProviderId, clientUserId } : CreateWebhookAgentLinkRequest = req.body;
    
//     // Validate required parameters.
//     if (!agentId || !webhookProviderId || !clientUserId) {
//       res.status(400).json({
//         success: false,
//         error: 'agentId, webhookProviderId, and clientUserId are required'
//       } as ErrorResponse);
//       return;
//     }
    
//     // Check if this agent is already mapped to this webhook provider for the user.
//     const getResponse = await getAgentIdForWebhook({ webhookProviderId, clientUserId });
//     if (!getResponse.success) {
//       res.status(500).json(getResponse);
//       return;
//     }
    
//     // If the agent is already mapped, return a 200 OK response indicating no change needed.
//     if (getResponse.data === agentId) {
//       res.status(200).json(getResponse);
//       return;
//     }
    
//     // Call the service function to map the agent to the webhook.
//     // This service function handles ensuring the webhook exists.
//     const mapResponse = await mapAgentToWebhook({ agentId, webhookProviderId, clientUserId });
//     if (!mapResponse.success) {
//       res.status(500).json(mapResponse);
//       return;
//     }
    
//     // Respond with 201 Created status for a successful mapping.
//     res.status(201).json(mapResponse);

//   } catch (error) {
//     // Log the error.
//     console.error('Error in POST /webhooks/map-agent route:', error);
//     // Send a generic 500 error response.
//     res.status(500).json({
//       success: false,
//       error: 'Failed to map agent to webhook',
//       details: error instanceof Error ? error.message : 'Unknown internal server error'
//       } as ErrorResponse);
//   }
// });

// /**
//  * @route GET /webhooks/:webhook_provider_id/agent
//  * @description Retrieves the agent ID mapped to a specific webhook provider for a user.
//  *              Expects webhook_provider_id as a route parameter and user_id as a query parameter.
//  * @param {Request} req - Express request object, containing webhook_provider_id in params and user_id in query.
//  * @param {Response} res - Express response object.
//  */
// router.get('/:webhookProviderId/agent', async (req: Request, res: Response): Promise<void> => {
//   try {
//     // Extract webhook provider ID from route parameters.
//     const { webhookProviderId } = req.params;
//     // Extract user ID from query parameters.
//     const clientUserId = req.query.clientUserId as string;
    
//     // Validate required parameters.
//     if (!webhookProviderId || !clientUserId) {
//       res.status(400).json({
//         success: false,
//         error: 'webhookProviderId (in path) and clientUserId (in query) are required'
//       } as ErrorResponse);
//       return;
//     }
    
//     // Call the service function to get the mapped agent ID.
//     const getResponse = await getAgentIdForWebhook({ webhookProviderId, clientUserId });
    
//     // If no agent is mapped, return a 404 Not Found response.
//     if (!getResponse.success) {
//       res.status(404).json(getResponse);
//       return;
//     }
    
//     // Respond with 200 OK and the mapping details.
//     res.status(200).json(getResponse);
//   } catch (error) {
//     // Log the error.
//     console.error(`Error in GET /webhooks/:webhookProviderId/agent route:`, error);
//     // Send a generic 500 error response.
//     res.status(500).json({
//       success: false,
//       error: 'Failed to get agent for webhook',
//       details: error instanceof Error ? error.message : 'Unknown internal server error'
//     } as ErrorResponse);
//   }
// });

// /**
//  * @route POST /webhooks/events
//  * @description Creates a new webhook event for a provider and user
//  *              Expects webhook_provider_id, user_id, and webhook_event_data in the request body.
//  * @param {Request} req - Express request object.
//  * @param {Response} res - Express response object.
//  */
// router.post('/events', async (req: Request, res: Response): Promise<void> => {
//   try {
//     // Extract parameters from the request body
//     const { webhookProviderId, clientUserId, webhookEventPayload } : CreateWebhookEventRequest = req.body;
    
//     // Validate required parameters
//     if (!webhookProviderId || !clientUserId || !webhookEventPayload) {
//       res.status(400).json({
//         success: false,
//         error: 'webhookProviderId, clientUserId, and webhookEventPayload are required'
//       } as ErrorResponse);
//       return;
//     }
    
//     // No strict validation on webhook_event_data structure
//     // This allows for different webhook providers to have different event structures
    
//     // Call the service function to create the webhook event
//     const createResponse = await createWebhookEvent({ webhookProviderId, clientUserId, webhookEventPayload });
//     if (!createResponse.success) {
//       res.status(500).json(createResponse);
//       return;
//     }
//     // Respond with success 
//     res.status(201).json(createResponse);
//   } catch (error) {
//     // Log the error
//     console.error('Error in POST /webhooks/events route:', error);
//     // Send error response
//     res.status(500).json({
//       success: false,
//       error: 'Failed to create webhook event',
//       details: error instanceof Error ? error.message : 'Unknown internal server error'
//     } as ErrorResponse);
//   }
// });

// /**
//  * @route GET /webhooks/crisp/users/:website_id
//  * @description Retrieves all user IDs associated with a specific Crisp website ID
//  * @param {Request} req - Express request object with website_id as a route parameter
//  * @param {Response} res - Express response object
//  */
// router.get('/crisp/users/:websiteId', async (req: Request, res: Response): Promise<void> => {
//   try {
//     // Extract website_id from route parameters
//     const { websiteId  } = req.params;
    
//     // Validate required parameter
//     if (!websiteId) {
//       res.status(400).json({
//         success: false,
//         error: 'websiteId is required'
//       } as ErrorResponse);
//       return;
//     }
    
//     // Call the service function to get user IDs associated with this website ID
//     const getResponse = await getUserIdsByWebsiteId({ webhookProviderId: 'crisp', websiteId });
    
//     // If no users are found, return a 404 Not Found response
//     if (!getResponse.success) {
//       res.status(404).json(getResponse);
//       return;
//     }
    
//     // Respond with 200 OK and the user IDs
//     res.status(200).json(getResponse);
//   } catch (error) {
//     // Log the error
//     console.error(`Error in GET /webhooks/crisp/users/:website_id route:`, error);
//     // Send a generic 500 error response
//     res.status(500).json({
//       success: false,
//       error: 'Failed to get users for website ID',
//       details: error instanceof Error ? error.message : 'Unknown internal server error'
//     } as ErrorResponse);
//   }
// });

// /**
//  * @route POST /webhooks/get-agent
//  * @description Gets the agent ID from the agent_webhook table for a specific user and webhook provider.
//  *              Expects user_id and webhook_provider_id in the request body.
//  * @param {Request} req - Express request object.
//  * @param {Response} res - Express response object.
//  */
// router.post('/get-agent', async (req: Request, res: Response): Promise<void> => {
//   try {
//     // Extract parameters from the request body
//     const { clientUserId, webhookProviderId } : GetWebhookAgentLinkRequest = req.body;
    
//     // Validate required parameters
//     if (!clientUserId || !webhookProviderId) {
//       res.status(400).json({
//         success: false,
//         error: 'clientUserId and webhookProviderId are required'
//       } as ErrorResponse);
//       return;
//     }
    
//     // Call the service function to get the agent ID
//     const getResponse = await getAgentIdForWebhook({ webhookProviderId, clientUserId });
    
//     // If no agent is found, return a 404 Not Found response
//     if (!getResponse.success) {
//       res.status(404).json(getResponse);
//       return;
//     }
    
//     // Respond with 200 OK and the agent ID
//     res.status(200).json(getResponse);
//   } catch (error) {
//     // Log the error
//     console.error('Error in POST /webhooks/get-agent route:', error);
//     // Send a generic 500 error response
//     res.status(500).json({
//       success: false,
//       error: 'Failed to get agent for webhook and user',
//       details: error instanceof Error ? error.message : 'Unknown internal server error'
//     } as ErrorResponse);
//   }
// });

// export default router; 