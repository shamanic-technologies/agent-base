// /**
//  * Express Route for Setting Up Webhooks
//  * Handles POST requests to /api/setup-webhook
//  */
// import { Router, Request, Response, NextFunction } from 'express';
// import { createWebhookAgentLink } from '../services/databaseService.js'; // Import the service function
// import { WebhookProviderId, Webhook, ErrorResponse, ServiceResponse, SetupWebhookRequest, CreateWebhookAgentLinkRequest, WebhookAgentLink, ServiceCredentials } from '@agent-base/types';
// import { getAuthHeaders } from '@agent-base/api-client';
// // Create a new Express Router
// const router = Router();

// /**
//  * @route POST /api/setup-webhook
//  * @description Handles requests to configure a webhook provider and map it to an agent.
//  *              Expects webhook_provider_id, user_id, and agent_id in the request body.
//  *              Optional webhook_data can also be included.
//  * @param {Request} req - Express request object.
//  * @param {Response} res - Express response object.
//  * @param {NextFunction} next - Express next middleware function (for error handling).
//  */
// router.post('/api/setup-webhook', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
//   try {
//     // Extract required data from the request body.
//     const { webhookProviderId, agentId, webhookCredentials } : SetupWebhookRequest = req.body;
//     const setupWebhookRequest = req.body;

//     // Get the service credentials from the request headers.
//     const serviceCredentialsResponse : ServiceResponse<ServiceCredentials> = getAuthHeaders(req);
//     if (!serviceCredentialsResponse.success) {
//       console.error(`[WebhookService][Route] Error in GET /api/setup-webhook: ${serviceCredentialsResponse.error}`);
//       res.status(401).json(serviceCredentialsResponse);
//       return;
//     }
//     const serviceCredentials = serviceCredentialsResponse.data;


//     // --- Input Validation ---
//     if (!webhookProviderId) {
//       // Send a 400 Bad Request if webhook_provider_id is invalid.
//       console.error(`[WebhookService][Route] Invalid webhookProviderId: ${webhookProviderId}. Supported providers: ${Object.values(WebhookProviderId).join(', ')}`);
//       res.status(400).json({
//         success: false, 
//         error: `Invalid webhookProviderId: ${webhookProviderId}. Supported providers: ${Object.values(WebhookProviderId).join(', ')}`
//       } as ErrorResponse);
//       return; // Stop further processing
//     }
//     if (!agentId) {
//       console.error(`[WebhookService][Route] Invalid agentId: ${agentId}`);
//       // Send a 400 Bad Request if agent_id is missing.
//       res.status(400).json({ success: false, error: 'agentId is required in the request body' } as ErrorResponse);
//       return;
//     }
//     if (!webhookCredentials) {
//       console.error(`[WebhookService][Route] Invalid webhookCredentials: ${webhookCredentials}`);
//       // Send a 400 Bad Request if webhook_credentials is missing.
//       res.status(400).json({ success: false, error: 'webhookCredentials is required in the request body' } as ErrorResponse);
//       return;
//     }
//     // --- End Input Validation ---

//     // Call the service function to perform the setup and mapping.
//     // The service function handles calls to the database-service and throws errors on failure.
//     const webhookAgentLinkResponse : ServiceResponse<WebhookAgentLink> = await createWebhookAgentLink(
//       serviceCredentials,
//       setupWebhookRequest
//     );

//     if (!webhookAgentLinkResponse.success) {
//       console.error(`[WebhookService][Route] Error in POST /api/setup-webhook: ${webhookAgentLinkResponse.error}`);
//       res.status(500).json(webhookAgentLinkResponse);
//       return;
//     }

//     // If the service call is successful, send a 200 OK response with the mapping details.
//     res.status(200).json(webhookAgentLinkResponse);

//   } catch (error: unknown) {
//     // Log the error that occurred during processing.
//     console.error('[WebhookService][Route] Error in POST /api/setup-webhook:', error);
    
//     // Pass the error to the global Express error handler (defined in server.ts).
//     // This centralizes error response logic.
//     next(error); 
//   }
// });

// // Export the router to be used in server.ts
// export default router; 