/**
 * Express Route for Setting Up Webhooks
 * Handles POST requests to /api/setup-webhook
 */
import { Router, Request, Response, NextFunction } from 'express';
import { setupWebhookAndMapAgent } from '../services/databaseService.js'; // Import the service function
import { WebhookProvider, WebhookResponse, Webhook } from '@agent-base/agents';

// Create a new Express Router
const router = Router();

/**
 * @route POST /api/setup-webhook
 * @description Handles requests to configure a webhook provider and map it to an agent.
 *              Expects webhook_provider_id, user_id, and agent_id in the request body.
 *              Optional webhook_data can also be included.
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next middleware function (for error handling).
 */
router.post('/api/setup-webhook', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Extract required data from the request body.
    const { webhook_provider_id, user_id, agent_id, webhook_credentials } = req.body;

    // --- Input Validation ---
    if (!webhook_provider_id || !Object.values(WebhookProvider).includes(webhook_provider_id as WebhookProvider)) {
      // Send a 400 Bad Request if webhook_provider_id is invalid.
      res.status(400).json({
        success: false, 
        error: `Invalid webhook_provider_id: ${webhook_provider_id}. Supported providers: ${Object.values(WebhookProvider).join(', ')}`
      } as WebhookResponse);
      return; // Stop further processing
    }
    if (!user_id) {
      // Send a 400 Bad Request if user_id is missing.
      res.status(400).json({ success: false, error: 'user_id is required in the request body' } as WebhookResponse);
      return;
    }
    if (!agent_id) {
      // Send a 400 Bad Request if agent_id is missing.
      res.status(400).json({ success: false, error: 'agent_id is required in the request body' } as WebhookResponse);
      return;
    }
    // --- End Input Validation ---

    // Log the incoming request details.
    console.log(`[WebhookService][Route] POST /api/setup-webhook request received:`, {
      webhook_provider_id,
      user_id,
      agent_id,
      webhook_credentials: webhook_credentials || {}, // Log empty object if data is null/undefined
    });

    // Create webhook data from request using the Webhook interface
    const webhookData: Webhook = {
      webhook_provider_id,
      user_id,
      webhook_credentials: webhook_credentials || {}
    };

    // Call the service function to perform the setup and mapping.
    // The service function handles calls to the database-service and throws errors on failure.
    const mappingResult = await setupWebhookAndMapAgent(
      webhook_provider_id,
      user_id,
      agent_id,
      webhookData.webhook_credentials // Pass webhook credentials
    );

    // If the service call is successful, send a 200 OK response with the mapping details.
    res.status(200).json({
      success: true,
      data: {
        provider: mappingResult.webhook_provider_id,
        user_id: mappingResult.user_id,
        agent_id: mappingResult.agent_id,
        message: `Webhook for ${mappingResult.webhook_provider_id} configured and mapped to agent ${mappingResult.agent_id} successfully.`
      }
    } as WebhookResponse);

  } catch (error: unknown) {
    // Log the error that occurred during processing.
    console.error('[WebhookService][Route] Error in POST /api/setup-webhook:', error);
    
    // Pass the error to the global Express error handler (defined in server.ts).
    // This centralizes error response logic.
    next(error); 
  }
});

// Export the router to be used in server.ts
export default router; 