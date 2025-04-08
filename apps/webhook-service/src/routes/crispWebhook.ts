/**
 * Crisp Webhook Routes
 * 
 * Routes for handling Crisp webhook events and agent mappings
 */
import express from 'express';
import { body } from 'express-validator';
import { 
  handleCrispWebhook, 
  addAgentToCrispWebhook, 
  removeAgentFromCrispWebhook
} from '../controllers/crispWebhookController.js';
import { validateRequest, validateApiKey } from '../middleware/validationMiddleware.js';

// Create router
const router = express.Router();

/**
 * POST /webhooks/crisp
 * 
 * Receive webhook events from Crisp
 */
router.post('/', handleCrispWebhook);

/**
 * POST /webhooks/crisp/map-agent
 * 
 * Map an agent to Crisp webhook events
 * 
 * Body parameters:
 * - agent_id: string - ID of the agent to map
 */
router.post(
  '/map-agent',
  [
    validateApiKey,
    body('agent_id').isString().notEmpty().withMessage('agent_id is required'),
    validateRequest
  ],
  addAgentToCrispWebhook
);

/**
 * POST /webhooks/crisp/unmap-agent
 * 
 * Unmap an agent from Crisp webhook events
 * 
 * Body parameters:
 * - agent_id: string - ID of the agent to unmap
 */
router.post(
  '/unmap-agent',
  [
    validateApiKey,
    body('agent_id').isString().notEmpty().withMessage('agent_id is required'),
    validateRequest
  ],
  removeAgentFromCrispWebhook
);

/**
 * GET /webhooks/crisp/register-url
 * 
 * Get instructions for registering the webhook URL with Crisp
 */
router.get('/register-url', validateApiKey, (req: express.Request, res: express.Response) => {
  const webhookServiceUrl = process.env.WEBHOOK_SERVICE_URL || 'https://your-webhook-service-url.com';
  
  res.status(200).json({
    success: true,
    webhook_url: `${webhookServiceUrl}/webhooks/crisp`,
    instructions: [
      '1. Go to your Crisp dashboard',
      '2. Navigate to Settings > Websites',
      '3. Select your website',
      '4. Go to Settings > Webhook',
      '5. Add a new webhook with the URL above',
      '6. Select at least the "message:send" event',
      '7. Save the webhook configuration'
    ]
  });
});

export default router; 