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
    
    if (!agent_id) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameter: agent_id'
      });
      return;
    }
    
    // Ensure the webhook exists in database
    await ensureWebhookExists('crisp');
    
    // Check if webhook already has an agent (since we only allow one agent per webhook)
    const existingAgent = await getAgentForWebhook('crisp');
    if (existingAgent) {
      // If we already have an agent and it's the same one, just return success
      if (existingAgent === agent_id) {
        res.status(200).json({
          success: true,
          message: `Agent ${agent_id} is already mapped to Crisp webhook`
        });
        return;
      }
      
      // If it's a different agent, we need to update the mapping
      // First delete the existing mapping
      await deleteAgentWebhookMapping('crisp');
    }
    
    // Insert the agent-webhook relation in database
    const databaseUrl = process.env.DATABASE_SERVICE_URL || 'http://localhost:3006';
    const databaseApiKey = process.env.DATABASE_SERVICE_API_KEY || '';
    
    const response = await axios.post(
      `${databaseUrl}/query`,
      {
        query: 'INSERT INTO agent_webhook (agent_id, webhook_id) VALUES ($1, $2)',
        params: [agent_id, 'crisp']
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': databaseApiKey
        }
      }
    );
    
    if (!response.data.success) {
      throw new Error(`Database error: ${response.data.error}`);
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
    
    if (!agent_id) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameter: agent_id'
      });
      return;
    }
    
    // Verify that this agent is actually mapped to the webhook
    const existingAgent = await getAgentForWebhook('crisp');
    if (!existingAgent || existingAgent !== agent_id) {
      res.status(400).json({
        success: false,
        error: `Agent ${agent_id} is not mapped to Crisp webhook`
      });
      return;
    }
    
    // Delete the agent-webhook relation
    await deleteAgentWebhookMapping('crisp');
    
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
 */
async function ensureWebhookExists(webhookId: string): Promise<void> {
  try {
    const databaseUrl = process.env.DATABASE_SERVICE_URL || 'http://localhost:3006';
    const databaseApiKey = process.env.DATABASE_SERVICE_API_KEY || '';
    
    // Check if webhook exists
    const checkResponse = await axios.post(
      `${databaseUrl}/query`,
      {
        query: 'SELECT webhook_id FROM webhook WHERE webhook_id = $1',
        params: [webhookId]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': databaseApiKey
        }
      }
    );
    
    // If webhook doesn't exist, create it
    if (checkResponse.data.rows?.length === 0) {
      const createResponse = await axios.post(
        `${databaseUrl}/query`,
        {
          query: 'INSERT INTO webhook (webhook_id, webhook_data) VALUES ($1, $2)',
          params: [webhookId, JSON.stringify({})]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': databaseApiKey
          }
        }
      );
      
      if (!createResponse.data.success) {
        throw new Error(`Failed to create webhook: ${createResponse.data.error}`);
      }
    }
  } catch (error) {
    console.error(`❌ [CRISP WEBHOOK] Error ensuring webhook exists:`, error);
    throw error;
  }
}

/**
 * Delete an agent-webhook mapping
 * @param webhookId - ID of the webhook provider
 */
async function deleteAgentWebhookMapping(webhookId: string): Promise<void> {
  try {
    const databaseUrl = process.env.DATABASE_SERVICE_URL || 'http://localhost:3006';
    const databaseApiKey = process.env.DATABASE_SERVICE_API_KEY || '';
    
    const response = await axios.post(
      `${databaseUrl}/query`,
      {
        query: 'DELETE FROM agent_webhook WHERE webhook_id = $1',
        params: [webhookId]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': databaseApiKey
        }
      }
    );
    
    if (!response.data.success) {
      throw new Error(`Database error: ${response.data.error}`);
    }
  } catch (error) {
    console.error(`❌ [CRISP WEBHOOK] Error deleting agent-webhook mapping:`, error);
    throw error;
  }
}

/**
 * Get the agent ID mapped to a specific webhook from database
 * @param webhookId - ID of the webhook provider
 * @returns Agent ID mapped to the webhook, or null if none found
 */
async function getAgentForWebhook(webhookId: string): Promise<string | null> {
  try {
    console.log(`🔍 [CRISP WEBHOOK] Looking up agent for webhook: ${webhookId}`);
    
    const databaseUrl = process.env.DATABASE_SERVICE_URL || 'http://localhost:3006';
    const databaseApiKey = process.env.DATABASE_SERVICE_API_KEY || '';
    
    const response = await axios.post(
      `${databaseUrl}/query`,
      {
        query: 'SELECT agent_id FROM agent_webhook WHERE webhook_id = $1',
        params: [webhookId]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': databaseApiKey
        }
      }
    );
    
    if (!response.data.success) {
      throw new Error(`Database error: ${response.data.error}`);
    }
    
    // Extract agent ID from response (return null if no rows)
    if (!response.data.rows || response.data.rows.length === 0) {
      return null;
    }
    
    return response.data.rows[0].agent_id || null;
  } catch (error) {
    console.error(`❌ [CRISP WEBHOOK] Error getting agent for webhook:`, error);
    throw new Error(`Failed to get agent: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Process webhook event and forward to the mapped agent
 * @param event - Webhook event to process
 * @returns Result of forwarding attempt
 */
async function forwardEventToAgent(event: WebhookEvent): Promise<{ 
  success: boolean, 
  error?: string
}> {
  try {
    const webhookId = event.provider.toLowerCase();
    console.log(`📤 [CRISP WEBHOOK] Forwarding ${event.event_type} event from ${webhookId}`);
    
    // Get the agent mapped to this webhook provider from database
    const agentId = await getAgentForWebhook(webhookId);
    
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
  } catch (error) {
    console.error(`❌ [CRISP WEBHOOK] Error processing webhook event:`, error);
    return {
      success: false,
      error: `Processing error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
} 