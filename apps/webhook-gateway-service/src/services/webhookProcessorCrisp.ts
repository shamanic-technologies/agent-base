/* 
 * DEPRECATED: Webhook processing logic moved to webhookRoutes.ts
 * calling webhook-store/resolve and agent-service/run.
 *
 * Original file content commented out below:
 * 
 * import { WebhookProviderId, WebhookEventPayload, ErrorResponse, ServiceResponse } from '@agent-base/types';
 * import { Request, Response } from 'express';
 * import { storeWebhookEvent } from './databaseService.js';
 * import axios from 'axios';
 * // @ts-ignore
 * import { Message } from 'ai';
 * import { get } from 'http';
 * 
 * export async function processWebhookCrisp(req: Request, res: Response): Promise<void> {
 *   const payload: WebhookEventPayload = req.body;
 *   const user_id = req.headers['x-user-id'] as string;
 *   const api_key = req.headers['x-api-key'] as string;
 * 
 *   console.log(`[WebhookGatewayService] Processing Crisp webhook for user: ${user_id}`, 
 *     JSON.stringify(payload, null, 2));
 *   
 *   if (payload.event !== 'message:send') {
 *     res.status(400).json({
 *       success: false,
 *       error: `Only message:send events are supported`
 *     } as ErrorResponse);
 *     return;
 *   }
 *   
 *   try {    
 *     await storeWebhookEvent(WebhookProviderId.CRISP, user_id, payload);
 *     console.log(`[WebhookGatewayService] Stored webhook event in database for user: ${user_id}`);
 *     
 *     const agentResponse = await axios.post(`${process.env.DATABASE_SERVICE_URL}/webhooks/get-agent`, {
 *       user_id,
 *       webhook_provider_id: WebhookProviderId.CRISP
 *     },
 *     {
 *       headers: {
 *         'x-user-id': user_id,
 *         'x-api-key': api_key
 *       }
 *     });
 *     
 *     if (!agentResponse.data.success) {
 *       throw new Error(`Failed to get agent for user ${user_id}, provider ${WebhookProviderId.CRISP}: ${agentResponse.data.error || 'Unknown database service error'}`);
 *     }
 *     
 *     const agent_id = agentResponse.data.data.agent_id;
 *     console.log(`[WebhookGatewayService] Retrieved agent_id: ${agent_id} for user_id: ${user_id}`);
 *     
 *     const session_id = payload.data?.session_id;
 *     if (!session_id) {
 *       throw new Error('Missing session_id in Crisp webhook payload');
 *     }
 *     
 *     console.log(`[WebhookGatewayService] Creating conversation with id: ${session_id} for agent: ${agent_id}, user: ${user_id}`);
 *     const conversationResponse = await axios.post(`${process.env.AGENT_SERVICE_URL}/conversation/create-conversation`, 
 *       {
 *         conversation_id: session_id,
 *         agent_id: agent_id,
 *         channel_id: WebhookProviderId.CRISP
 *       },
 *       {
 *         headers: {
 *           'x-user-id': user_id,
 *           'x-api-key': api_key
 *         }
 *       }
 *     );
 *     
 *     if (!conversationResponse.data.success) {
 *       throw new Error(`Failed to create conversation ${session_id} for agent ${agent_id}: ${conversationResponse.data.error || 'Unknown agent service error'}`);
 *     }
 *     
 *     console.log(`[WebhookGatewayService] Successfully created conversation with id: ${session_id}`);
 *         
 *     const formattedMessage = `
 *     You received this payload from ${WebhookProviderId.CRISP} via webhook subscription: ${JSON.stringify(payload)}.
 *     To reply search for the utility whom id is 'crisp_send_message'`;
 *     
 *     const message: Message = {
 *       id: `msgw-${Date.now()}`,
 *       role: 'user',
 *       content: formattedMessage,
 *       createdAt: new Date()
 *     }
 *     console.log(`[WebhookGatewayService] Calling agent-service run endpoint for agent_id: ${agent_id}, conversation_id: ${session_id}, user: ${user_id}`);
 *     await axios.post(`${process.env.AGENT_SERVICE_URL}/run`, 
 *       {
 *         conversation_id: session_id,
 *         message
 *       },
 *       {
 *         headers: {
 *           'x-user-id': user_id,
 *           'x-api-key': api_key,
 *         }
 *       }
 *     );
 *     
 *     console.log(`[WebhookGatewayService] Successfully called agent-service run endpoint`);
 *     
 *     res.status(200).json({
 *       success: true,
 *       message: `Webhook processed successfully`
 *     } as ServiceResponse<boolean>);
 *   } catch (error) {
 *     console.error(`[WebhookGatewayService] Error processing Crisp webhook for user ${user_id}:`, error);
 *     res.status(500).json({
 *       success: false,
 *       error: error instanceof Error ? error.message : 'Unknown error processing webhook'
 *     } as ErrorResponse);
 *   }
 * } 
 */


