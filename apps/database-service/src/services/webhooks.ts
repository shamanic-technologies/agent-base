/**
 * Webhooks Service
 * 
 * Handles all database operations related to webhooks
 */
import { PoolClient } from 'pg';
import { getClient } from '../db.js';
import { WebhookEventPayload, CreateWebhookRequest, WebhookEventRecord, ServiceResponse, GetClientUserAgentInput, MapAgentToWebhookRequest, CreateWebhookEventRequest } from '@agent-base/types';
import { GetAgentIdForWebhookRequest, GetUserIdsByWebsiteIdRequest } from '../routes/types/webhooks.js';
/**
 * Retrieves the agent ID mapped to a specific webhook provider for a given user.
 * 
 * @param {string} webhookProviderId - The identifier of the webhook provider (e.g., 'slack', 'discord').
 * @param {string} clientUserId - The UUID of the user who owns the webhook configuration.
 * @returns {Promise<string | null>} A promise that resolves to the agent's UUID if a mapping exists, otherwise null.
 * @throws {Error} Throws an error if the database query fails.
 */
export async function getAgentIdForWebhook(input: GetAgentIdForWebhookRequest)
: Promise<ServiceResponse<string>> {
  let client: PoolClient | null = null;
  try {
    // Obtain a database client from the pool.
    client = await getClient();
    const { webhookProviderId, clientUserId } = input;
    // Execute the query to find the agent_id associated with the webhook_provider_id and user_id.
    const result = await client.query(
      'SELECT agent_id FROM agent_webhook WHERE webhook_provider_id = $1 AND client_user_id = $2',
      [webhookProviderId, clientUserId]
    );
    
    // Return the agent_id if a row is found, otherwise return null.
    return result.rows.length > 0 ? 
      {
        success: true,
        data: result.rows[0].agent_id
      } : 
      {
        success: false,
        error: 'No agent found for webhook'
      };
  } catch (error: any) {
    // Log the error for debugging purposes.
    console.error('Error getting agent for webhook:', error);
    // Rethrow the error to be handled by the caller.
    return {
      success: false,
      error: `Failed to get agent for webhook: ${error.message}`
    };
  } finally {
    // Release the client back to the pool if it was acquired.
    if (client) {
      client.release();
    }
  }
}

/**
 * Creates a new webhook registration or updates an existing one for a user.
 * If a webhook with the same provider ID and user ID already exists, its data is updated.
 * 
 * @param {string} webhookProviderId - The identifier of the webhook provider.
 * @param {string} clientUserId - The UUID of the user.
 * @param {Record<string, any>} [webhookCredentials={}] - Optional JSON data associated with the webhook configuration.
 * @returns {Promise<boolean>} A promise that resolves to true if the operation was successful, otherwise false (though errors are thrown).
 * @throws {Error} Throws an error if the database operation fails.
 */
export async function createWebhook(input: CreateWebhookRequest): Promise<ServiceResponse<CreateWebhookRequest>> {
  let client: PoolClient | null = null;
  try {
    // Obtain a database client.
    client = await getClient();
    const { webhookProviderId, clientUserId, webhookCredentials } = input;
    // Check if a webhook entry already exists for this provider and user.
    const existingWebhook = await client.query(
      'SELECT webhook_provider_id FROM webhook WHERE webhook_provider_id = $1 AND client_user_id = $2',
      [webhookProviderId, clientUserId]
    );
    
    if (existingWebhook.rows.length > 0) {
      // If it exists, update the webhook_credentials and updated_at timestamp.
      await client.query(
        'UPDATE webhook SET webhook_credentials = $1, updated_at = CURRENT_TIMESTAMP WHERE webhook_provider_id = $2 AND client_user_id = $3',
        [webhookCredentials, webhookProviderId, clientUserId]
      );
    } else {
      // If it doesn't exist, insert a new webhook entry.
      await client.query(
        'INSERT INTO webhook (webhook_provider_id, client_user_id, webhook_credentials) VALUES ($1, $2, $3)',
        [webhookProviderId, clientUserId, webhookCredentials]
      );
    }
    
    // Return true indicating success.
    return {
      success: true,
      data: input
    };
  } catch (error: any) {
    // Log the error.
    console.error('Error creating or updating webhook:', error);
    // Throw an error to signal failure.
    return {
      success: false,
      error: `Failed to create or update webhook: ${error.message}`
    };
  } finally {
    // Release the client.
    if (client) {
      client.release();
    }
  }
}

/**
 * Maps an agent to a specific webhook provider for a user.
 * This creates or updates the mapping in the agent_webhook table.
 * It ensures the corresponding webhook entry exists first by calling createWebhook.
 * 
 * @param {string} agentId - The UUID of the agent to map.
 * @param {string} webhookProviderId - The identifier of the webhook provider.
 * @param {string} clientUserId - The UUID of the user.
 * @returns {Promise<boolean>} A promise that resolves to true if the mapping was successful.
 * @throws {Error} Throws an error if the database operation fails or the prerequisite webhook cannot be ensured.
 */
export async function mapAgentToWebhook(input: MapAgentToWebhookRequest): Promise<ServiceResponse<string>> {
  let client: PoolClient | null = null;
  try {
    // Obtain a database client.
    client = await getClient();
    const { agentId, webhookProviderId, clientUserId } = input;
    // Check if a mapping already exists for this webhook provider and user.
    const existingMapping = await client.query(
      'SELECT agent_id FROM agent_webhook WHERE webhook_provider_id = $1 AND client_user_id = $2',
      [webhookProviderId, clientUserId]
    );
    
    if (existingMapping.rows.length > 0) {
      // If mapping exists, update the agent_id associated with it.
      await client.query(
        'UPDATE agent_webhook SET agent_id = $1 WHERE webhook_provider_id = $2 AND client_user_id = $3',
        [agentId, webhookProviderId, clientUserId]
      );
    } else {
      // If no mapping exists, insert a new one.
      await client.query(
        'INSERT INTO agent_webhook (agent_id, webhook_provider_id, client_user_id) VALUES ($1, $2, $3)',
        [agentId, webhookProviderId, clientUserId]
      );
    }
    
    // Return true indicating success.
    return {
      success: true,
      data: 'Agent mapped to webhook successfully'
    };
  } catch (error: any) {
    // Log the error.
    console.error('Error mapping agent to webhook:', error);
    // Throw an error to signal failure.
    return {
      success: false,
      error: `Failed to map agent to webhook: ${error.message}`
    };
  } finally {
    // Release the client.
    if (client) {
      client.release();
    }
  }
}

/**
 * Creates a new webhook event record
 * 
 * @param {string} webhookProviderId - The identifier of the webhook provider (e.g., 'crisp', 'discord').
 * @param {string} clientUserId - The UUID of the user who owns the webhook.
 * @param {WebhookEventPayload} webhookEventPayload - JSON data containing the event details.
 * @returns {Promise<boolean>} A promise that resolves to true if the operation was successful.
 * @throws {Error} Throws an error if the database operation fails.
 */
export async function createWebhookEvent(input: CreateWebhookEventRequest): Promise<ServiceResponse<string>> {
  let client: PoolClient | null = null;
  try {
    // Obtain a database client
    client = await getClient();
    const { webhookProviderId, clientUserId, webhookEventPayload } = input;
    // Insert the webhook event
    await client.query(
      'INSERT INTO webhook_events (webhook_provider_id, client_user_id, webhook_event_payload) VALUES ($1, $2, $3)',
      [webhookProviderId, clientUserId, webhookEventPayload]
    );
    
    // Return true indicating success
    return {
      success: true,
      data: 'Webhook event created successfully'
    };
  } catch (error: any) {
    // Log the error
    console.error('Error creating webhook event:', error);
    // Throw an error to signal failure
    return {
      success: false,
      error: `Failed to create webhook event: ${error.message}`
    };
  } finally {
    // Release the client
    if (client) {
      client.release();
    }
  }
}

/**
 * Retrieves user IDs associated with a specific website ID for a given webhook provider
 * 
 * @param {string} webhookProviderId - The identifier of the webhook provider (e.g., 'crisp')
 * @param {string} websiteId - The website ID to search for in webhook_credentials
 * @returns {Promise<string[]>} A promise that resolves to an array of user IDs
 * @throws {Error} Throws an error if the database query fails
 */
export async function getUserIdsByWebsiteId(input: GetUserIdsByWebsiteIdRequest): Promise<ServiceResponse<string[]>> {
  let client: PoolClient | null = null;
  try {
    // Obtain a database client
    client = await getClient();
    const { webhookProviderId, websiteId } = input;
    // Execute query to find user_ids where webhook_provider_id matches
    // and webhook_credentials contains the specified website_id
    const result = await client.query(
      "SELECT client_user_id FROM webhook WHERE webhook_provider_id = $1 AND webhook_credentials->>'website_id' = $2",
      [webhookProviderId, websiteId]
    );
    
    // Extract and return array of user_ids
    return {
      success: true,
      data: result.rows.map(row => row.user_id)
    };
  } catch (error: any) {
    // Log the error
    console.error('Error getting users by website ID:', error);
    // Rethrow the error to be handled by the caller
    return {
      success: false,
      error: `Failed to get users by website ID: ${error.message}`
    };
  } finally {
    // Release the client back to the pool
    if (client) {
      client.release();
    }
  }
}

