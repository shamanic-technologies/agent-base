/**
 * Express Route for handling webhook events
 */
import { Router, Request, Response, NextFunction } from 'express';
import { processWebhookCrisp } from '../services/webhookProcessorCrisp.js';
import { WebhookProviderId, BaseResponse } from '@agent-base/types';

// Create a new Express Router
const router = Router();

/**
 * @route POST /webhook/:webhook_provider_id
 * @description Handles incoming webhook events for a specific provider
 * @param {Request} req - Express request object with webhook_provider_id parameter
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
router.post('/webhook/:webhookProviderId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Extract webhook_provider_id from params and ensure it's a string
    const webhookProviderId = req.params.webhookProviderId;
    if (!Object.values(WebhookProviderId).includes(webhookProviderId as WebhookProviderId)) {
      res.status(400).json({
        success: false,
        error: `Unsupported webhook provider: ${webhookProviderId}. Supported providers: ${Object.values(WebhookProviderId).join(', ')}`
      } as BaseResponse);
      return;
    }
    
    if (webhookProviderId === WebhookProviderId.CRISP) {
      await processWebhookCrisp(req, res);
    } else {
      throw new Error(`Unsupported webhook provider: ${webhookProviderId}`);
    }
  } catch (error: unknown) {
    console.error(`[WebhookService] Error processing webhook:`, error);
    next(error);
  }
});

export default router; 