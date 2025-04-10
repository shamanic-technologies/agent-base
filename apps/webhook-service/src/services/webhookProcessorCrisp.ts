/**
 * Handler for webhook message:send events
 */
import { WebhookProvider, WebhookEventPayloadCrisp, WebhookResponse, WebhookEventPayload } from '@agent-base/agents';
import { Request, Response } from 'express';
import { storeWebhookEvent } from './databaseService.js';
import axios from 'axios';

/**
 * Process a webhook request end-to-end
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function processWebhookCrisp(req: Request, res: Response): Promise<void> {
  const payload: WebhookEventPayloadCrisp = req.body;
  
  // Log the incoming webhook (truncated for readability)
  console.log(`[WebhookService] Received webhook from Crisp:`, 
    JSON.stringify(payload).substring(0, 200) + (JSON.stringify(payload).length > 200 ? '...' : ''));
  
  // Process only message:send events
  if (payload.event !== 'message:send') {
    res.status(400).json({
      success: false,
      error: `Only message:send events are supported`
    } as WebhookResponse);
    return;
  }
  
  try {
    // Extract website_id from the payload
    const website_id = payload.data?.website_id;
    
    if (!website_id) {
      throw new Error('Missing website_id in Crisp webhook payload');
    }
    
    // Get user_id from the website_id using the database service endpoint
    const userResponse = await axios.get(`${process.env.DATABASE_SERVICE_URL}/webhooks/crisp/users/${website_id}`);
    
    if (!userResponse.data.success || !userResponse.data.data?.user_ids?.length) {
      throw new Error(`No users found for Crisp website ID: ${website_id}`);
    } else if (userResponse.data.data?.user_ids?.length > 1) {
      throw new Error(`Multiple users found for Crisp website ID: ${website_id}`);
    }
    
    // Get the first user ID
    const user_id = userResponse.data.data.user_ids[0];
    
    // Store the webhook event in the database
    await storeWebhookEvent(WebhookProvider.CRISP, user_id, payload);
    console.log(`[WebhookService] Stored webhook event in database`);
    
    // Process the webhook message
    const messageContent = processWebhookMessage(payload);
    
    console.log(`[WebhookService] Processed message content: ${messageContent.substring(0, 100)}${messageContent.length > 100 ? '...' : ''}`);
    
    // Here you would call your agent/chat service with the message
    // For example:
    // await sendToAgent(payload.data.session_id, messageContent, payload.data.user);
    
    // Return standardized response
    res.status(200).json({
      success: true,
      message: `Webhook processed successfully`
    } as WebhookResponse);
  } catch (error) {
    // Send error response if database storage fails
    console.error(`[WebhookService] Error processing webhook:`, error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error processing webhook'
    } as WebhookResponse);
  }
} 

/**
 * Processes a webhook message:send event
 * 
 * @param {WebhookEventPayloadCrisp} payload - Crisp webhook payload
 * @returns {string} - Extracted message content
 * @throws {Error} If the payload is invalid or not a message:send event
 */
export function processWebhookMessage(payload: WebhookEventPayloadCrisp): string {
  if (!payload || !payload.event) {
    throw new Error('Invalid webhook payload: missing event field');
  }

  if (payload.event !== 'message:send') {
    throw new Error(`Unsupported event type: ${payload.event}`);
  }

  const data = payload.data || {};
  
  // Extract the message content
  const content = data.content;
  if (content === undefined) {
    throw new Error('Invalid message:send payload: missing content field');
  }
  
  return typeof content === 'string' ? content : JSON.stringify(content);
}
