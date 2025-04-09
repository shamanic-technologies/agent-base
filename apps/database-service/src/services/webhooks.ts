/**
 * Webhooks Service
 * 
 * Handles all database operations related to webhooks
 */
import { PoolClient } from 'pg';
import { getClient } from '../db.js';

/**
 * Retrieves the agent ID mapped to a specific webhook provider for a given user.
 * 
 * @param {string} webhook_provider_id - The identifier of the webhook provider (e.g., 'slack', 'discord').
 * @param {string} user_id - The UUID of the user who owns the webhook configuration.
 * @returns {Promise<string | null>} A promise that resolves to the agent's UUID if a mapping exists, otherwise null.
 * @throws {Error} Throws an error if the database query fails.
 */
export async function getAgentForWebhook(webhook_provider_id: string, user_id: string): Promise<string | null> {
  let client: PoolClient | null = null;
  try {
    // Obtain a database client from the pool.
    client = await getClient();
    
    // Execute the query to find the agent_id associated with the webhook_provider_id and user_id.
    const result = await client.query(
      'SELECT agent_id FROM agent_webhook WHERE webhook_provider_id = $1 AND user_id = $2', // Updated column name
      [webhook_provider_id, user_id]
    );
    
    // Return the agent_id if a row is found, otherwise return null.
    return result.rows.length > 0 ? result.rows[0].agent_id : null;
  } catch (error: any) {
    // Log the error for debugging purposes.
    console.error('Error getting agent for webhook:', error);
    // Rethrow the error to be handled by the caller.
    throw new Error(`Failed to get agent for webhook: ${error.message}`);
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
 * @param {string} webhook_provider_id - The identifier of the webhook provider.
 * @param {string} user_id - The UUID of the user.
 * @param {Record<string, any>} [webhook_data={}] - Optional JSON data associated with the webhook configuration.
 * @returns {Promise<boolean>} A promise that resolves to true if the operation was successful, otherwise false (though errors are thrown).
 * @throws {Error} Throws an error if the database operation fails.
 */
export async function createWebhook(
  webhook_provider_id: string, // Renamed parameter
  user_id: string, 
  webhook_data: Record<string, any> = {}
): Promise<boolean> {
  let client: PoolClient | null = null;
  try {
    // Obtain a database client.
    client = await getClient();
    
    // Check if a webhook entry already exists for this provider and user.
    const existingWebhook = await client.query(
      'SELECT webhook_provider_id FROM webhook WHERE webhook_provider_id = $1 AND user_id = $2', // Updated column name
      [webhook_provider_id, user_id]
    );
    
    if (existingWebhook.rows.length > 0) {
      // If it exists, update the webhook_data and updated_at timestamp.
      await client.query(
        'UPDATE webhook SET webhook_data = $1, updated_at = CURRENT_TIMESTAMP WHERE webhook_provider_id = $2 AND user_id = $3', // Updated column name
        [JSON.stringify(webhook_data), webhook_provider_id, user_id]
      );
    } else {
      // If it doesn't exist, insert a new webhook entry.
      await client.query(
        'INSERT INTO webhook (webhook_provider_id, user_id, webhook_data) VALUES ($1, $2, $3)', // Updated column name
        [webhook_provider_id, user_id, JSON.stringify(webhook_data)]
      );
    }
    
    // Return true indicating success.
    return true;
  } catch (error: any) {
    // Log the error.
    console.error('Error creating or updating webhook:', error);
    // Throw an error to signal failure.
    throw new Error(`Failed to create or update webhook: ${error.message}`);
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
 * @param {string} agent_id - The UUID of the agent to map.
 * @param {string} webhook_provider_id - The identifier of the webhook provider.
 * @param {string} user_id - The UUID of the user.
 * @returns {Promise<boolean>} A promise that resolves to true if the mapping was successful.
 * @throws {Error} Throws an error if the database operation fails or the prerequisite webhook cannot be ensured.
 */
export async function mapAgentToWebhook(
  agent_id: string, 
  webhook_provider_id: string, // Renamed parameter
  user_id: string
): Promise<boolean> {
  let client: PoolClient | null = null;
  try {
    // Obtain a database client.
    client = await getClient();
    
    // Ensure the webhook entry exists before attempting to map an agent to it.
    // This simplifies logic by guaranteeing the foreign key constraint will be met.
    await createWebhook(webhook_provider_id, user_id); // Use updated parameter name
    
    // Check if a mapping already exists for this webhook provider and user.
    const existingMapping = await client.query(
      'SELECT agent_id FROM agent_webhook WHERE webhook_provider_id = $1 AND user_id = $2', // Updated column name
      [webhook_provider_id, user_id]
    );
    
    if (existingMapping.rows.length > 0) {
      // If mapping exists, update the agent_id associated with it.
      await client.query(
        'UPDATE agent_webhook SET agent_id = $1 WHERE webhook_provider_id = $2 AND user_id = $3', // Updated column name
        [agent_id, webhook_provider_id, user_id]
      );
    } else {
      // If no mapping exists, insert a new one.
      await client.query(
        'INSERT INTO agent_webhook (agent_id, webhook_provider_id, user_id) VALUES ($1, $2, $3)', // Updated column name
        [agent_id, webhook_provider_id, user_id]
      );
    }
    
    // Return true indicating success.
    return true;
  } catch (error: any) {
    // Log the error.
    console.error('Error mapping agent to webhook:', error);
    // Throw an error to signal failure.
    throw new Error(`Failed to map agent to webhook: ${error.message}`);
  } finally {
    // Release the client.
    if (client) {
      client.release();
    }
  }
}

/**
 * Removes the mapping between an agent and a webhook provider for a specific user.
 * 
 * @param {string} webhook_provider_id - The identifier of the webhook provider.
 * @param {string} user_id - The UUID of the user.
 * @returns {Promise<boolean>} A promise that resolves to true if the unmapping was successful (even if no mapping existed).
 * @throws {Error} Throws an error if the database delete operation fails.
 */
export async function unmapAgentFromWebhook(
  webhook_provider_id: string, // Renamed parameter
  user_id: string
): Promise<boolean> {
  let client: PoolClient | null = null;
  try {
    // Obtain a database client.
    client = await getClient();
    
    // Execute the delete operation. It's safe even if no row matches.
    await client.query(
      'DELETE FROM agent_webhook WHERE webhook_provider_id = $1 AND user_id = $2', // Updated column name
      [webhook_provider_id, user_id]
    );
    
    // Return true indicating the operation completed.
    return true;
  } catch (error: any) {
    // Log the error.
    console.error('Error unmapping agent from webhook:', error);
    // Throw an error to signal failure.
    throw new Error(`Failed to unmap agent from webhook: ${error.message}`);
  } finally {
    // Release the client.
    if (client) {
      client.release();
    }
  }
} 