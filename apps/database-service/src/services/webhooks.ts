/**
 * Webhooks Service
 * 
 * Handles all database operations related to webhooks
 */
import { PoolClient } from 'pg';
import { getClient } from '../db.js';

/**
 * Get the agent ID mapped to a webhook for a user
 * @param webhook_id - ID of the webhook
 * @param user_id - ID of the user
 * @returns Agent ID if found, null otherwise
 */
export async function getAgentForWebhook(webhook_id: string, user_id: string): Promise<string | null> {
  let client: PoolClient | null = null;
  try {
    client = await getClient();
    
    const result = await client.query(
      'SELECT agent_id FROM agent_webhook WHERE webhook_id = $1 AND user_id = $2',
      [webhook_id, user_id]
    );
    
    return result.rows.length > 0 ? result.rows[0].agent_id : null;
  } catch (error: any) {
    console.error('Error getting agent for webhook:', error);
    return null;
  } finally {
    if (client) {
      client.release();
    }
  }
}

/**
 * Create a webhook in the database
 * @param webhook_id - ID of the webhook provider
 * @param user_id - ID of the user
 * @param webhook_data - Additional webhook data as JSON
 * @returns True if successful, false otherwise
 */
export async function createWebhook(
  webhook_id: string, 
  user_id: string, 
  webhook_data: Record<string, any> = {}
): Promise<boolean> {
  let client: PoolClient | null = null;
  try {
    client = await getClient();
    
    // Check if webhook exists
    const existingWebhook = await client.query(
      'SELECT webhook_id FROM webhook WHERE webhook_id = $1 AND user_id = $2',
      [webhook_id, user_id]
    );
    
    if (existingWebhook.rows.length > 0) {
      // Update existing webhook
      await client.query(
        'UPDATE webhook SET webhook_data = $1, updated_at = CURRENT_TIMESTAMP WHERE webhook_id = $2 AND user_id = $3',
        [JSON.stringify(webhook_data), webhook_id, user_id]
      );
    } else {
      // Insert new webhook
      await client.query(
        'INSERT INTO webhook (webhook_id, user_id, webhook_data) VALUES ($1, $2, $3)',
        [webhook_id, user_id, JSON.stringify(webhook_data)]
      );
    }
    
    return true;
  } catch (error: any) {
    console.error('Error creating webhook:', error);
    return false;
  } finally {
    if (client) {
      client.release();
    }
  }
}

/**
 * Map an agent to a webhook
 * @param agent_id - ID of the agent
 * @param webhook_id - ID of the webhook
 * @param user_id - ID of the user
 * @returns True if successful, false otherwise
 */
export async function mapAgentToWebhook(
  agent_id: string, 
  webhook_id: string, 
  user_id: string
): Promise<boolean> {
  let client: PoolClient | null = null;
  try {
    client = await getClient();
    
    // Ensure webhook exists
    await createWebhook(webhook_id, user_id);
    
    // Check if mapping already exists
    const existingMapping = await client.query(
      'SELECT agent_id FROM agent_webhook WHERE webhook_id = $1 AND user_id = $2',
      [webhook_id, user_id]
    );
    
    if (existingMapping.rows.length > 0) {
      // Update existing mapping
      await client.query(
        'UPDATE agent_webhook SET agent_id = $1 WHERE webhook_id = $2 AND user_id = $3',
        [agent_id, webhook_id, user_id]
      );
    } else {
      // Insert new mapping
      await client.query(
        'INSERT INTO agent_webhook (agent_id, webhook_id, user_id) VALUES ($1, $2, $3)',
        [agent_id, webhook_id, user_id]
      );
    }
    
    return true;
  } catch (error: any) {
    console.error('Error mapping agent to webhook:', error);
    return false;
  } finally {
    if (client) {
      client.release();
    }
  }
}

/**
 * Unmap an agent from a webhook
 * @param webhook_id - ID of the webhook
 * @param user_id - ID of the user
 * @returns True if successful, false otherwise
 */
export async function unmapAgentFromWebhook(
  webhook_id: string, 
  user_id: string
): Promise<boolean> {
  let client: PoolClient | null = null;
  try {
    client = await getClient();
    
    await client.query(
      'DELETE FROM agent_webhook WHERE webhook_id = $1 AND user_id = $2',
      [webhook_id, user_id]
    );
    
    return true;
  } catch (error: any) {
    console.error('Error unmapping agent from webhook:', error);
    return false;
  } finally {
    if (client) {
      client.release();
    }
  }
} 