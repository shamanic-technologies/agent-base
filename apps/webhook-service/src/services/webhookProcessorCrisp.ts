/**
 * Handler for webhook message:send events
 */
import { WebhookProvider, WebhookEventPayloadCrisp, WebhookResponse, WebhookEventPayload } from '@agent-base/agents';
import { Request, Response } from 'express';
import { storeWebhookEvent } from './databaseService.js';
import axios from 'axios';
// @ts-ignore
import { Message } from 'ai';

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
    JSON.stringify(payload, null, 2));
  
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
    
    
    // Get the agent_id associated with this user and Crisp webhook provider
    const agentResponse = await axios.post(`${process.env.DATABASE_SERVICE_URL}/webhooks/get-agent`, {
      user_id,
      webhook_provider_id: WebhookProvider.CRISP
    });
    
    if (!agentResponse.data.success) {
      throw new Error(`Failed to get agent for user ${user_id} and webhook provider ${WebhookProvider.CRISP}: ${agentResponse.data.error}`);
    }
    
    // Extract the agent_id from the response
    const agent_id = agentResponse.data.data.agent_id;
    console.log(`[WebhookService] Retrieved agent_id: ${agent_id} for user_id: ${user_id}`);
    
    // Extract session_id to use as conversation_id
    const session_id = payload.data?.session_id;
    if (!session_id) {
      throw new Error('Missing session_id in Crisp webhook payload');
    }
    
    // Create a new conversation in the agent service
    console.log(`[WebhookService] Creating conversation with id: ${session_id} for agent: ${agent_id}`);
    const conversationResponse = await axios.post(`${process.env.AGENT_SERVICE_URL}/conversation/create-conversation`, 
      {
        conversation_id: session_id,
        agent_id: agent_id,
        channel_id: WebhookProvider.CRISP
      },
      {
        headers: {
          'x-user-id': user_id,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!conversationResponse.data.success) {
      throw new Error(`Failed to create conversation: ${conversationResponse.data.error}`);
    }
    
    console.log(`[WebhookService] Successfully created conversation with id: ${session_id}`);
        
    // Create the message to send to the agent
    const formattedMessage = `
    You received this payload from ${WebhookProvider.CRISP} via webhook subscription: ${JSON.stringify(payload)}.
    To reply search for the utility whom id is 'crisp_send_message'`;
    
    const message: Message = {
      id: `msgw-${Date.now()}`,
      role: 'user',
      content: formattedMessage,
      createdAt: new Date()
    }
    // Call the agent-service run endpoint with the webhook data
    console.log(`[WebhookService] Calling agent-service run endpoint for agent_id: ${agent_id}, conversation_id: ${session_id}`);
    await axios.post(`${process.env.AGENT_SERVICE_URL}/run`, 
      {
        conversation_id: session_id,
        message
      },
      {
        headers: {
          'x-user-id': user_id,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`[WebhookService] Successfully called agent-service run endpoint`);
    
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


