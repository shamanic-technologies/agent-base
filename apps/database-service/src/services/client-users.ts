/**
 * Client Users Service
 * 
 * Handles all database operations related to client users.
 * Client users represent the end-users interacting with agents via different platforms.
 */
import { PoolClient } from 'pg';
import { getClient } from '../db.js';
import {
  ClientUser, // Assuming this type exists in @agent-base/types and includes platformUserId, platformClientUserId
  UpsertClientUserInput,
  ServiceResponse,
} from '@agent-base/types';
import { CLIENT_USERS_TABLE } from '../utils/schema-initializer.js';
import { mapClientUserFromDatabase } from '@agent-base/types';

/**
 * Creates or updates a client user record based on platform_user_id and auth_user_id.
 * If a user with the given platform_user_id and auth_user_id exists, it returns the existing record.
 * Otherwise, it creates a new record with the provided details.
 * 
 * @param {UpsertClientUserInput} input - The details of the client user to upsert.
 * @returns {Promise<ServiceResponse<ClientUser>>} A response containing the data of the created or found client user.
 */
export async function upsertClientUser(input: UpsertClientUserInput): Promise<ServiceResponse<ClientUser>> {
  let client: PoolClient | null = null;
  
  // Validate input
  if (!input || !input.platformUserId || !input.authUserId) {
    console.error('Missing required fields: platformUserId and authUserId');
    return {
      success: false,
      error: 'Missing required fields: platformUserId and authUserId'
    };
  }

  try {
    client = await getClient();
    
    // Use INSERT ... ON CONFLICT to handle upsert logic based on the UNIQUE constraint
    // on platform_client_user_id. If the platform_client_user_id already exists,
    // DO NOTHING is specified, and the existing row is returned by the subsequent SELECT.
    // Note: This approach assumes we don't need to update any fields if the user already exists.
    // If updates were needed, DO UPDATE SET would be used.
    const upsertQuery = `
      INSERT INTO "${CLIENT_USERS_TABLE}" (platform_user_id, auth_user_id)
      VALUES ($1, $2)
      ON CONFLICT (platform_user_id, auth_user_id) DO NOTHING;
    `;
    
    // Log the parameters just before executing the query
    console.log('[Upsert Client User] Executing upsert query with params:', {
      param1: input.platformUserId,
      param2: input.authUserId
    });

    await client.query(upsertQuery, [input.platformUserId, input.authUserId]);

    // Regardless of insert or conflict, fetch the record matching platform_client_user_id
    const selectQuery = `
      SELECT * FROM "${CLIENT_USERS_TABLE}"
      WHERE platform_user_id = $1 AND auth_user_id = $2
      LIMIT 1;
    `;

    const result = await client.query(selectQuery, [input.platformUserId, input.authUserId]);

    if (result.rowCount === 0 || !result.rows[0]) {
      // This case should ideally not happen if the INSERT or the conflict path worked,
      // but included for robustness.
      console.error('Failed to find client user after upsert attempt for platformUserId:', input.platformUserId);
      return {
        success: false,
        error: 'Failed to upsert client user record.'
      };
    }
    
    // Map the database record using the updated helper function
    const upsertedUser = mapClientUserFromDatabase(result.rows[0]);
    
    return {
      success: true,
      data: upsertedUser
    };
  } catch (error: any) {
    console.error('Error upserting client user:', error);
    // Handle potential unique constraint violation or other DB errors more gracefully if needed
    // For now, just return the generic error message
    if (error.message.includes('Invalid database row') || error.message.includes('missing required fields')) {
       return { 
        success: false, 
        error: `Internal mapping error: ${error.message}`
      };
    }
    return { 
      success: false, 
      error: error.message || 'Failed to upsert client user'
    };
  } finally {
    // Ensure the client is always released
    if (client) {
      client.release();
    }
  }
} 