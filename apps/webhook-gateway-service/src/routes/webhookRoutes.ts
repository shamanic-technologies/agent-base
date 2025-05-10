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
  ServiceResponse,
  ConversationId
} from '@agent-base/types';

// Import Message type directly from Vercel AI SDK
import { Message } from 'ai'; 
// Import new API client functions
import { getOrCreatePlatformApiKeySecretByName,
  getOrCreateConversationInternalApiService, 
  resolveWebhookExternalApiService, 
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
 *              This route first resolves webhook details. If successful, it immediately returns a 202 Accepted.
 *              Subsequent processing (API key, conversation, agent run) happens asynchronously.
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
router.post('/:webhookProviderId/:subscribedEventId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // --- 1. Extract and Validate Input ---
  const webhookProviderId = req.params.webhookProviderId as WebhookProviderId;
  const subscribedEventId = req.params.subscribedEventId as string;
  const payload: WebhookEventPayload = req.body;

  // Validate provider ID using the Enum
  if (!Object.values(UtilityProvider).includes(webhookProviderId as UtilityProvider)) {
    res.status(400).json({
      success: false,
      error: `Unsupported webhook provider: ${webhookProviderId}. Supported providers: ${Object.values(UtilityProvider).join(', ')}`
    } as BaseResponse);
    return;
  }

  try {
    // --- 2. Resolve IDs via Webhook Store (Synchronous for initial response) ---
    const webhookResolutionRequest: WebhookResolutionRequest = {
      webhookProviderId,
      subscribedEventId,
      payload
    };
    const resolveResponse = await resolveWebhookExternalApiService(webhookResolutionRequest);

    if (!resolveResponse.success) {
        console.error(`[Webhook Gateway] Failed to resolve webhook IDs for ${webhookProviderId}:`, resolveResponse.error);
        // Per user request, return 400 if resolution fails
        res.status(400).json(resolveResponse); // Assuming resolveResponse contains { success: false, error: ... }
        return;
    }

    const { platformUserId, clientUserId, agentId, conversationId: resolvedConversationId } = resolveResponse.data;

    // --- 3. Respond Immediately (202 Accepted) ---
    res.status(202).json({ success: true, message: "Webhook accepted for processing." } as BaseResponse);

    // --- 4. Perform Subsequent Operations Asynchronously ---
    // Self-invoking async function to handle processing without blocking the response
    (async () => {
      try {
        // --- 4a. Get or Create Platform API Key ---
        const platformApiKeyResponse: ServiceResponse<SecretValue> = await getOrCreatePlatformApiKeySecretByName({
          platformUserId,
          keyName: 'Webhook' // Using a generic key name for webhooks
        });

        if (!platformApiKeyResponse.success) {
          console.error(`[Webhook Gateway ASYNC] Failed to get or create platform API key for user ${platformUserId}:`, platformApiKeyResponse.error);
          return; // Stop further async processing for this event
        }
        const platformApiKey = platformApiKeyResponse.data.value;

        // --- 4b. Get or Create Conversation ---
        const conversationInput: CreateConversationInput = {
          agentId,
          channelId: webhookProviderId, // Using webhookProviderId as the channel
          conversationId: resolvedConversationId // Use the conversationId from the resolution step
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
          console.error(`[Webhook Gateway ASYNC] Failed to get or create conversation for agent ${agentId}, resolved conversation ID ${resolvedConversationId}:`, getOrCreateConversationResponse.error);
          return; // Stop further async processing
        }
        // Use the conversation ID returned by the service for triggering the agent
        // Corrected based on linter error: assuming .data IS the ConversationId or needs casting.
        const actualConversationId = getOrCreateConversationResponse.data.conversationId;

        // --- 4c. Prepare and Trigger Agent Run ---
        const messageContent = 'You received this webhook event from ' + webhookProviderId + '/' + subscribedEventId + ' with the following payload:\n```json\n' + JSON.stringify(payload, null, 2) + '\n```';

        const webhookMessage: Message = {
            id: nanoid(),
            role: 'user',
            content: messageContent,
            createdAt: new Date(),
        };

        console.log(`[Webhook Gateway ASYNC] Triggering agent run for conversation ${actualConversationId} with agent ${agentId}.`);
        const runResponse = await triggerAgentRun(actualConversationId, webhookMessage, internalServiceCredentials);

        if (!runResponse.success) {
            console.error(`[Webhook Gateway ASYNC] Failed to trigger agent run for agent ${agentId}, conversation ${actualConversationId}:`, runResponse.error);
            // Error is logged, response already sent
        } else {
            console.log(`[Webhook Gateway ASYNC] Successfully triggered agent run for conversation ${actualConversationId}. Event ID: ${webhookMessage.id}`);
        }

      } catch (asyncError: unknown) {
        // Catch any unexpected errors during the asynchronous processing
        console.error(`[Webhook Gateway ASYNC] Unhandled error in asynchronous processing for webhook ${webhookProviderId}/${subscribedEventId}:`, asyncError);
      }
    })(); // Immediately invoke the async function

  } catch (error: unknown) {
    // This outer catch handles errors from the synchronous part of the execution
    // (e.g., unexpected errors from resolveWebhookExternalApiService or before res.status(202).json)
    console.error(`[Webhook Gateway SYNC] Critical error processing /webhook/${webhookProviderId}/${subscribedEventId} before async stage:`, error);
    // If headersSent is false, it means an error occurred before the 202 response was sent.
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'An unexpected internal error occurred.' } as BaseResponse);
    }
    // If headers were already sent, the error is logged, but we can't send another response.
  }
});

export default router; 