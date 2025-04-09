/**
 * Crisp Webhook Controller
 * 
 * Handles webhook events from Crisp
 */
import { Request, Response } from 'express';
import axios from 'axios';
import { 
  WebhookProvider, 
  WebhookEvent, 
  AgentRunRequest, 
  AgentRunResponse,
  CrispWebhookEvent
} from '../types/index.js';
import { processCrispEvent } from '../services/crispService.js';

/**
 * Handle incoming Crisp webhook events
 * @param req - Express request
 * @param res - Express response
 */
export async function handleCrispWebhook(req: Request, res: Response): Promise<void> {
  try {
    console.log(`🔔 [CRISP WEBHOOK] Received webhook event from Crisp`);
    
    // Get signature from headers for verification
    const signature = req.headers['x-crisp-signature'] as string;
    
    // Validate the request payload
    const payload = req.body as CrispWebhookEvent;
    
    if (!payload || !payload.event || !payload.data) {
      console.error(`❌ [CRISP WEBHOOK] Invalid webhook payload:`, payload);
      res.status(400).json({
        success: false,
        error: 'Invalid webhook payload'
      });
      return;
    }
    
    // Process the event
    console.log(`📝 [CRISP WEBHOOK] Processing ${payload.event} event`);
    
    // Only process specific event types
    if (payload.event !== 'message:send') {
      console.log(`ℹ️ [CRISP WEBHOOK] Event type ${payload.event} not handled, acknowledging receipt`);
      res.status(200).json({ success: true, message: 'Event acknowledged but not processed' });
      return;
    }
    
    // Process the Crisp event into our standardized webhook event format
    const webhookEvent = processCrispEvent(payload, signature);
    
    // Acknowledge receipt immediately to meet Crisp's 3-second timeout
    // This prevents Crisp from retrying the webhook
    res.status(200).json({ success: true, message: 'Event received and processing' });
    
    // Process the event asynchronously after sending response
    forwardEventToAgent(webhookEvent)
      .then(result => {
        if (result.success) {
          console.log(`✅ [CRISP WEBHOOK] Successfully forwarded to agent`);
        } else {
          console.error(`❌ [CRISP WEBHOOK] Failed to forward: ${result.error}`);
        }
      })
      .catch(error => {
        console.error(`❌ [CRISP WEBHOOK] Error forwarding event:`, error);
      });
    
  } catch (error) {
    console.error(`❌ [CRISP WEBHOOK] Error processing webhook:`, error);
    
    // Always return 200 to Crisp to prevent retries
    // We'll handle errors internally
    res.status(200).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Add agent mapping to Crisp webhook in database
 * @param req - Express request
 * @param res - Express response
 */
export async function addAgentToCrispWebhook(req: Request, res: Response): Promise<void> {
  try {
    console.log(`📝 [CRISP WEBHOOK] Agent mapping request`);
    
    // Extract agent ID from request body
    const { agent_id } = req.body;
    const user_id = process.env.DEFAULT_USER_ID || 'system';
    
    if (!agent_id) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameter: agent_id'
      });
      return;
    }
    
    // Ensure the webhook exists in database
    await ensureWebhookExists('crisp', user_id);
    
    // Check if webhook already has an agent
    const existingAgent = await getAgentForWebhook('crisp', user_id);
    if (existingAgent) {
      // If we already have an agent and it's the same one, just return success
      if (existingAgent === agent_id) {
        res.status(200).json({
          success: true,
          message: `Agent ${agent_id} is already mapped to Crisp webhook`
        });
        return;
      }
    }
    
    // Map the agent to the webhook using database-service endpoint
    const mapResult = await mapAgentToWebhook(agent_id, 'crisp', user_id);
    
    if (!mapResult.success) {
      throw new Error(`Failed to map agent: ${mapResult.error}`);
    }
    
    res.status(200).json({
      success: true,
      message: `Agent ${agent_id} mapped to Crisp webhook`
    });
  } catch (error) {
    console.error(`❌ [CRISP WEBHOOK] Error adding agent mapping:`, error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Remove agent mapping from Crisp webhook in database
 * @param req - Express request
 * @param res - Express response
 */
export async function removeAgentFromCrispWebhook(req: Request, res: Response): Promise<void> {
  try {
    console.log(`📝 [CRISP WEBHOOK] Agent unmapping request`);
    
    // Extract agent ID from request body
    const { agent_id } = req.body;
    const user_id = process.env.DEFAULT_USER_ID || 'system';
    
    if (!agent_id) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameter: agent_id'
      });
      return;
    }
    
    // Verify that this agent is actually mapped to the webhook
    const existingAgent = await getAgentForWebhook('crisp', user_id);
    if (!existingAgent || existingAgent !== agent_id) {
      res.status(400).json({
        success: false,
        error: `Agent ${agent_id} is not mapped to Crisp webhook`
      });
      return;
    }
    
    // Unmap the agent from webhook
    const unmapResult = await unmapAgentFromWebhook('crisp', user_id);
    
    if (!unmapResult.success) {
      throw new Error(`Failed to unmap agent: ${unmapResult.error}`);
    }
    
    res.status(200).json({
      success: true,
      message: `Agent ${agent_id} unmapped from Crisp webhook`
    });
  } catch (error) {
    console.error(`❌ [CRISP WEBHOOK] Error removing agent mapping:`, error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// --- Helper functions ---

/**
 * Ensure webhook exists in the database
 * @param webhookId - ID of the webhook provider (e.g., 'crisp')
 * @param userId - ID of the user
 */
async function ensureWebhookExists(webhookId: string, userId: string): Promise<void> {
  try {
    const databaseUrl = process.env.DATABASE_SERVICE_URL || 'http://localhost:3006';
    const databaseApiKey = process.env.DATABASE_SERVICE_API_KEY || '';
    
    // Create or update webhook using database-service endpoint
    const response = await axios.post(
      `${databaseUrl}/webhooks`,
      {
        webhook_id: webhookId,
        user_id: userId,
        webhook_data: {}
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': databaseApiKey
        }
      }
    );
    
    if (!response.data.success) {
      throw new Error(`Failed to ensure webhook exists: ${response.data.error}`);
    }
  } catch (error) {
    console.error(`❌ [CRISP WEBHOOK] Error ensuring webhook exists:`, error);
    throw error;
  }
}

/**
 * Map an agent to a webhook
 * @param agentId - ID of the agent
 * @param webhookId - ID of the webhook provider
 * @param userId - ID of the user
 * @returns Result of the mapping operation
 */
async function mapAgentToWebhook(
  agentId: string, 
  webhookId: string, 
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const databaseUrl = process.env.DATABASE_SERVICE_URL || 'http://localhost:3006';
    const databaseApiKey = process.env.DATABASE_SERVICE_API_KEY || '';
    
    const response = await axios.post(
      `${databaseUrl}/webhooks/map-agent`,
      {
        agent_id: agentId,
        webhook_id: webhookId,
        user_id: userId
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': databaseApiKey
        }
      }
    );
    
    return { 
      success: response.data.success,
      error: response.data.error
    };
  } catch (error) {
    console.error(`❌ [CRISP WEBHOOK] Error mapping agent to webhook:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Unmap an agent from a webhook
 * @param webhookId - ID of the webhook provider
 * @param userId - ID of the user
 * @returns Result of the unmapping operation
 */
async function unmapAgentFromWebhook(
  webhookId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const databaseUrl = process.env.DATABASE_SERVICE_URL || 'http://localhost:3006';
    const databaseApiKey = process.env.DATABASE_SERVICE_API_KEY || '';
    
    const response = await axios.post(
      `${databaseUrl}/webhooks/unmap-agent`,
      {
        webhook_id: webhookId,
        user_id: userId
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': databaseApiKey
        }
      }
    );
    
    return {
      success: response.data.success,
      error: response.data.error
    };
  } catch (error) {
    console.error(`❌ [CRISP WEBHOOK] Error unmapping agent from webhook:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get the agent ID mapped to a specific webhook from database
 * @param webhookId - ID of the webhook provider
 * @param userId - ID of the user
 * @returns Agent ID mapped to the webhook, or null if none found
 */
async function getAgentForWebhook(webhookId: string, userId: string): Promise<string | null> {
  try {
    console.log(`🔍 [CRISP WEBHOOK] Looking up agent for webhook: ${webhookId}`);
    
    const databaseUrl = process.env.DATABASE_SERVICE_URL || 'http://localhost:3006';
    const databaseApiKey = process.env.DATABASE_SERVICE_API_KEY || '';
    
    const response = await axios.get(
      `${databaseUrl}/webhooks/${webhookId}/agent?user_id=${userId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': databaseApiKey
        }
      }
    );
    
    if (response.data.success && response.data.data?.agent_id) {
      return response.data.data.agent_id;
    }
    
    return null;
  } catch (error: any) {
    // If it's a 404 error, it means no agent is mapped
    if (error.response && error.response.status === 404) {
      return null;
    }
    
    console.error(`❌ [CRISP WEBHOOK] Error getting agent for webhook:`, error);
    throw error;
  }
}

/**
 * Process webhook event and forward to the mapped agent
 * @param event - Webhook event to process
 * @returns Result of the forward operation
 */
async function forwardEventToAgent(event: WebhookEvent): Promise<{
  success: boolean,
  error?: string
}> {
  const webhookId = event.provider.toLowerCase();
  const userId = process.env.DEFAULT_USER_ID || 'system';
  console.log(`📤 [CRISP WEBHOOK] Forwarding ${event.event_type} event from ${webhookId}`);
  
  // Get the agent mapped to this webhook provider from database
  const agentId = await getAgentForWebhook(webhookId, userId);
  
  if (!agentId) {
    console.log(`ℹ️ [CRISP WEBHOOK] No agent mapped to ${webhookId}`);
    return { success: false, error: 'No agent mapped to this webhook' };
  }
  
  console.log(`🔔 [CRISP WEBHOOK] Forwarding event to agent ${agentId}`);
  
  try {
    // Construct conversation ID from session data
    let conversationId = '';
    
    if (event.provider === WebhookProvider.CRISP) {
      // For Crisp, use session_id as the conversation ID
      conversationId = event.raw_data.data?.session_id || `crisp_${Date.now()}`;
    } else {
      // For other providers, generate a conversation ID
      conversationId = `webhook_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    }
    
    // Prepare the payload for the agent run endpoint
    const payload: AgentRunRequest = {
      event_type: event.event_type,
      provider: event.provider,
      data: event.processed_data || event.raw_data,
      agent_id: agentId,
      conversation_id: conversationId
    };
    
    // Get the agent service URL
    const agentServiceUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:3040';
    
    // Call the agent run endpoint
    const response = await axios.post<AgentRunResponse>(
      `${agentServiceUrl}/run`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.AGENT_SERVICE_API_KEY || ''
        },
        timeout: 10000 // 10 second timeout
      }
    );
    
    if (response.data.success) {
      console.log(`✅ [CRISP WEBHOOK] Successfully forwarded to agent ${agentId}`);
      return { success: true };
    } else {
      console.error(`❌ [CRISP WEBHOOK] Agent ${agentId} returned error:`, response.data.error);
      return { 
        success: false, 
        error: `Agent error: ${response.data.error}` 
      };
    }
  } catch (error) {
    console.error(`❌ [CRISP WEBHOOK] Failed to forward to agent ${agentId}:`, error);
    return {
      success: false,
      error: `Forward error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
} 