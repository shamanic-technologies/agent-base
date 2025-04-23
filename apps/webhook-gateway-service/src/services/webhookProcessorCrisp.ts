/**
 * Handler for webhook message:send events from Crisp provider.
 * Assumes authentication and user identification have been handled by middleware.
 */
import { WebhookProviderId, WebhookEventPayload, ErrorResponse, ServiceResponse } from '@agent-base/types';
import { Request, Response } from 'express';
import { storeWebhookEvent } from './databaseService.js';
import axios from 'axios';
// @ts-ignore
import { Message } from 'ai';
import { get } from 'http';

/**
 * Process a webhook request end-to-end
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function processWebhookCrisp(req: Request, res: Response): Promise<void> {
  const payload: WebhookEventPayload = req.body;
  const user_id = req.headers['x-user-id'] as string;
  const api_key = req.headers['x-api-key'] as string;

  // Log the incoming webhook (truncated for readability)
  console.log(`[WebhookGatewayService] Processing Crisp webhook for user: ${user_id}`, 
    JSON.stringify(payload, null, 2));
  
  // Process only message:send events
  if (payload.event !== 'message:send') {
    res.status(400).json({
      success: false,
      error: `Only message:send events are supported`
    } as ErrorResponse);
    return;
  }
  
  try {    
    // Store the webhook event in the database
    await storeWebhookEvent(WebhookProviderId.CRISP, user_id, payload);
    console.log(`[WebhookGatewayService] Stored webhook event in database for user: ${user_id}`);
    
    // Get the agent_id associated with this user and Crisp webhook provider
    const agentResponse = await axios.post(`${process.env.DATABASE_SERVICE_URL}/webhooks/get-agent`, {
      user_id,
      webhook_provider_id: WebhookProviderId.CRISP
    },
    {
      headers: {
        'x-user-id': user_id,
        'x-api-key': api_key
      }
    });
    
    if (!agentResponse.data.success) {
      // Provide more specific error context
      throw new Error(`Failed to get agent for user ${user_id}, provider ${WebhookProviderId.CRISP}: ${agentResponse.data.error || 'Unknown database service error'}`);
    }
    
    // Extract the agent_id from the response
    const agent_id = agentResponse.data.data.agent_id;
    console.log(`[WebhookGatewayService] Retrieved agent_id: ${agent_id} for user_id: ${user_id}`);
    
    // Extract session_id to use as conversation_id from the payload
    const session_id = payload.data?.session_id;
    if (!session_id) {
      throw new Error('Missing session_id in Crisp webhook payload');
    }
    
    // Create a new conversation in the agent service
    console.log(`[WebhookGatewayService] Creating conversation with id: ${session_id} for agent: ${agent_id}, user: ${user_id}`);
    const conversationResponse = await axios.post(`${process.env.AGENT_SERVICE_URL}/conversation/create-conversation`, 
      {
        conversation_id: session_id,
        agent_id: agent_id,
        channel_id: WebhookProviderId.CRISP
      },
      {
        headers: {
          'x-user-id': user_id,
          'x-api-key': api_key
        }
      }
    );
    
    if (!conversationResponse.data.success) {
      // Provide more specific error context
      throw new Error(`Failed to create conversation ${session_id} for agent ${agent_id}: ${conversationResponse.data.error || 'Unknown agent service error'}`);
    }
    
    console.log(`[WebhookGatewayService] Successfully created conversation with id: ${session_id}`);
        
    // Create the message to send to the agent
    const formattedMessage = `
    You received this payload from ${WebhookProviderId.CRISP} via webhook subscription: ${JSON.stringify(payload)}.
    To reply search for the utility whom id is 'crisp_send_message'`;
    
    const message: Message = {
      id: `msgw-${Date.now()}`,
      role: 'user',
      content: formattedMessage,
      createdAt: new Date()
    }
    // Call the agent-service run endpoint with the webhook data
    console.log(`[WebhookGatewayService] Calling agent-service run endpoint for agent_id: ${agent_id}, conversation_id: ${session_id}, user: ${user_id}`);
    await axios.post(`${process.env.AGENT_SERVICE_URL}/run`, 
      {
        conversation_id: session_id,
        message
      },
      {
        headers: {
          'x-user-id': user_id,
          'x-api-key': api_key,
        }
      }
    );
    
    console.log(`[WebhookGatewayService] Successfully called agent-service run endpoint`);
    
    // Return standardized response
    res.status(200).json({
      success: true,
      message: `Webhook processed successfully`
    } as ServiceResponse<boolean>);
  } catch (error) {
    // Send error response if database storage fails
    console.error(`[WebhookGatewayService] Error processing Crisp webhook for user ${user_id}:`, error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error processing webhook'
    } as ErrorResponse);
  }
} 


