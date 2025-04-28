/**
 * Express Route for handling webhook events
 */
import { Router, Request, Response, NextFunction } from 'express';
// Remove unused import
// import { processWebhookCrisp } from '../services/webhookProcessorCrisp.js'; 
// Import the actual Enum for value checks, and types as needed
import { UtilityProvider,
  WebhookProviderId,
  BaseResponse,
  WebhookEventPayload,
  InternalServiceCredentials,
  CreateConversationInput,
  WebhookResolutionRequest,
  SecretValue,
  ServiceResponse
} from '@agent-base/types';

// Import Message type directly from Vercel AI SDK
import { Message } from 'ai'; 
// Import new API client functions
import { getOrCreatePlatformApiKeySecretByName,
  getOrCreateConversationInternalApiService, 
  resolveWebhook, 
  triggerAgentRun 
} from '@agent-base/api-client';

// Import utility to create a message ID
import { nanoid } from 'nanoid';

// Create a new Express Router
const router = Router();

/**
 * @route POST /:webhookProviderId/:subscribedEventId
 * @description Receives webhook payloads, resolves identifiers, and triggers the appropriate agent run.
 *              Assumes authentication/authorization middleware has run and populated platformApiKey,
 *              platformUserId, and potentially a default clientUserId if applicable.
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
router.post('/:webhookProviderId/:subscribedEventId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // --- 1. Extract and Validate Input --- 
  const webhookProviderId = req.params.webhookProviderId as WebhookProviderId;
  const subscribedEventId = req.params.subscribedEventId as string;
  const payload: WebhookEventPayload = req.body;

  try {
    // Validate provider ID using the Enum
    if (!Object.values(UtilityProvider).includes(webhookProviderId as UtilityProvider)) {
      res.status(400).json({
        success: false,
        error: `Unsupported webhook provider: ${webhookProviderId}. Supported providers: ${Object.values(UtilityProvider).join(', ')}`
      } as BaseResponse);
      return;
    }
    // --- 2. Resolve IDs via Webhook Store --- 
    const webhookResolutionRequest: WebhookResolutionRequest = {
      webhookProviderId,
      subscribedEventId,
      payload
    };
    const resolveResponse = await resolveWebhook(webhookResolutionRequest);

    if (!resolveResponse.success) {
        console.error(`[Webhook Gateway] Failed to resolve webhook IDs for ${webhookProviderId}:`, resolveResponse.error);
        // Return a generic error to the webhook sender
        res.status(500).json(resolveResponse);
        return;
    }

    const { platformUserId, clientUserId, agentId, conversationId } = resolveResponse.data;

    // --- 3. Get or Create Platform API Key for Webhook --- 

    const platformApiKeyResponse: ServiceResponse<SecretValue> = await getOrCreatePlatformApiKeySecretByName({
      platformUserId,
      keyName: 'Webhook'
    });
    console.log('platformApiKeyResponse', JSON.stringify(platformApiKeyResponse, null, 2));

    if (!platformApiKeyResponse.success) {
      console.error(`[Webhook Gateway] Failed to get or create platform API key for user ${platformUserId}:`, platformApiKeyResponse.error);
      res.status(500).json(platformApiKeyResponse);
      return;
    }

    const platformApiKey = platformApiKeyResponse.data.value;

    // --- 4. Get or Create Conversation --- 

    const conversationInput: CreateConversationInput = {
      agentId,
      channelId: webhookProviderId,
      conversationId
    };

    const internalServiceCredentials: InternalServiceCredentials = {
      platformApiKey,
      platformUserId,
      clientUserId
    };

    const getOrCreateConversationResponse = await getOrCreateConversationInternalApiService(
      conversationInput,
      internalServiceCredentials
    );

    if (!getOrCreateConversationResponse.success) {
      console.error(`[Webhook Gateway] Failed to get or create conversation for agent ${agentId}, conversation ${conversationId}:`, getOrCreateConversationResponse.error);
      res.status(500).json(getOrCreateConversationResponse);
      return;
    }
    
    // --- 5. Prepare and Trigger Agent Run --- 
    const messageContent = 'You received this webhook event:\n```json\n' + JSON.stringify(payload, null, 2) + '\n```';


    // Construct the message payload for the agent
    const webhookMessage: Message = {
        id: nanoid(), // Generate a unique message ID
        role: 'user', 
        content: messageContent,
        createdAt: new Date(),
    };

    const runResponse = await triggerAgentRun(conversationId, webhookMessage, internalServiceCredentials);

    if (!runResponse.success) {
        console.error(`[Webhook Gateway] Failed to trigger agent run for agent ${agentId}, conversation ${conversationId}:`, runResponse.error);
        // Return a generic error
        res.status(500).json({ success: false, error: 'Failed to process webhook event.' } as BaseResponse);
        return;
    }

    // --- 6. Respond to Webhook Sender --- 

    res.status(202).json(runResponse);

  } catch (error: unknown) {
    console.error(`[Webhook Gateway] Error processing /webhook/${webhookProviderId}/${subscribedEventId}:`, error);
    // Avoid leaking internal errors to the webhook sender
    res.status(500).json({ success: false, error: 'An internal error occurred.' } as BaseResponse);
    // Pass to Express error handler for internal logging if needed
    // next(error); 
  }
});

export default router; 