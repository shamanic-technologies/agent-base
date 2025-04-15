/**
 * Users Service
 * 
 * Handles all database operations related to users
 */
import { PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { getClient } from '../db.js';
import {
  UserRecord,
  UserResponse,
  GetOrCreateUserResponse,
  GetOrCreateUserInput,
  BaseResponse
} from '@agent-base/types';

// Table name constant
const USERS_TABLE = 'users';

/**
 * Gets user data by internal user_id
 * @param userId - The internal user_id to look up
 * @returns A response with user data if found
 */
export async function getUserById(userId: string): Promise<UserResponse> {
  let client: PoolClient | null = null;
  
  try {
    client = await getClient();
    
    // Query the users table for the record with matching user_id
    const query = `
      SELECT * FROM "${USERS_TABLE}" 
      WHERE user_id = $1 
      LIMIT 1
    `;
    
    const result = await client.query(query, [userId]);
    
    if (result.rowCount === 0) {
      return {
        success: false,
        error: 'User not found'
      };
    }
    
    return {
      success: true,
      data: result.rows[0] as UserRecord
    };
  } catch (error: any) {
    console.error('Error fetching user by user ID:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to fetch user'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
}

/**
 * Gets user data by provider user ID
 * Internal function for get-or-create workflow
 * @param providerUserId - The provider user ID to look up
 * @returns A response with user data if found
 */
async function getUserByProviderUserId(providerUserId: string): Promise<UserResponse> {
  let client: PoolClient | null = null;
  
  try {
    client = await getClient();
    
    // Query the users table for the record with matching provider user ID
    const query = `
      SELECT * FROM "${USERS_TABLE}" 
      WHERE provider_user_id = $1 
      LIMIT 1
    `;
    
    const result = await client.query(query, [providerUserId]);
    
    if (result.rowCount === 0) {
      return {
        success: false,
        error: 'User not found'
      };
    }
    
    return {
      success: true,
      data: result.rows[0] as UserRecord
    };
  } catch (error: any) {
    console.error('Error fetching user by provider user ID:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to fetch user'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
}

/**
 * Gets or creates a user by provider user ID
 * @param userData - User data including provider_user_id
 * @returns A response with the user data and whether it was created or updated
 */
export async function getOrCreateUserByProviderUserId(userData: GetOrCreateUserInput): Promise<GetOrCreateUserResponse> {
  let client: PoolClient | null = null;
  
  try {
    client = await getClient();
    
    if (!userData.provider_user_id) {
      return {
        success: false,
        error: 'Missing required field: provider_user_id'
      };
    }
    
    // First check if user exists
    const findResult = await getUserByProviderUserId(userData.provider_user_id);
    
    if (findResult.success && findResult.data) {
      // User exists, update it
      client = await getClient();
      const existingUser = findResult.data;
      
      const updateQuery = `
        UPDATE "${USERS_TABLE}"
        SET 
          email = COALESCE($1, email),
          display_name = COALESCE($2, display_name),
          profile_image = COALESCE($3, profile_image),
          last_login = NOW(),
          updated_at = NOW()
        WHERE user_id = $4
        RETURNING *
      `;
      
      const updateValues = [
        userData.email || null,
        userData.display_name || null,
        userData.profile_image || null,
        existingUser.user_id
      ];
      
      const updateResult = await client.query(updateQuery, updateValues);
      
      return {
        success: true,
        data: updateResult.rows[0] as UserRecord,
        updated: true
      };
    } else {
      // User doesn't exist, create it
      client = await getClient();
      const createQuery = `
        INSERT INTO "${USERS_TABLE}" (
          user_id,
          provider_user_id,
          email,
          display_name,
          profile_image,
          last_login,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), NOW())
        RETURNING *
      `;
      
      // Generate a new UUID
      const userId = uuidv4();
      
      const createValues = [
        userId,
        userData.provider_user_id,
        userData.email || null,
        userData.display_name || null,
        userData.profile_image || null
      ];
      
      const createResult = await client.query(createQuery, createValues);
      
      return {
        success: true,
        data: createResult.rows[0] as UserRecord,
        created: true
      };
    }
  } catch (error: any) {
    console.error('Error in getOrCreateUserByProviderUserId:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to get or create user'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
}
