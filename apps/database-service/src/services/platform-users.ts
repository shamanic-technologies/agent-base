/**
 * Users Service
 * 
 * Handles all database operations related to users
 */
import { PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { getClient } from '../db.js';
import {
  PlatformUserRecord,
  PlatformUser,
  GetOrCreatePlatformUserInput,
  BaseResponse,
  ServiceResponse,
  mapPlatformUserFromDatabase
} from '@agent-base/types';
import { PLATFORM_USERS_TABLE } from '../types/database-constants.js';

/**
 * Gets user data by internal user_id
 * @param platformUserId - The internal user_id to look up
 * @returns A response with user data if found
 */
export async function getPlatformUserById(platformUserId: string): Promise<ServiceResponse<PlatformUser>> {
  let client: PoolClient | null = null;
  
  try {
    client = await getClient();
    
    // Query the users table for the record with matching user_id
    const query = `
      SELECT * FROM "${PLATFORM_USERS_TABLE}" 
      WHERE id = $1 
      LIMIT 1
    `;
    
    const result = await client.query(query, [platformUserId]);
    
    if (result.rowCount === 0) {
      return {
        success: false,
        error: 'User not found'
      };
    }
    
    return {
      success: true,
      data: mapPlatformUserFromDatabase(result.rows[0])
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
 * @param authUserId - The provider auth_user_id to look up
 * @returns A response with user data if found
 */
async function getPlatformUserByAuthUserId(authUserId: string): Promise<ServiceResponse<PlatformUser>> {
  let client: PoolClient | null = null;
  
  try {
    client = await getClient();
    
    // Query the users table for the record with matching provider user ID
    const query = `
      SELECT * FROM "${PLATFORM_USERS_TABLE}" 
      WHERE auth_user_id = $1 
      LIMIT 1
    `;
    
    const result = await client.query(query, [authUserId]);
    
    if (result.rowCount === 0) {
      console.error(`[DB Service/getPlatformUserByAuthUserId] User not found for authUserId: ${authUserId}`);
      return {
        success: false,
        error: 'User not found'
      };
    }
    
    return {
      success: true,
      data: mapPlatformUserFromDatabase(result.rows[0])
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
export async function getOrCreatePlatformUserByAuthId(userData: GetOrCreatePlatformUserInput): Promise<ServiceResponse<PlatformUser>> {
  let client: PoolClient | null = null;
  
  try {
    client = await getClient();
    
    if (!userData.platformAuthUserId) {
      console.error('[DB Service/getOrCreatePlatformUserByAuthId] Missing required field: platformAuthUserId');
      return {
        success: false,
        error: 'Missing required field: platformAuthUserId'
      };
    }
    
    // First check if user exists
    const getResponse: ServiceResponse<PlatformUser> = await getPlatformUserByAuthUserId(userData.platformAuthUserId);
    
    if (getResponse.success && getResponse.data) {
      // User exists, update it
      client = await getClient();
      const existingUser = getResponse.data;
      
      const updateQuery = `
        UPDATE "${PLATFORM_USERS_TABLE}"
        SET 
          email = COALESCE($1, email),
          display_name = COALESCE($2, display_name),
          profile_image = COALESCE($3, profile_image),
          last_login = NOW(),
          updated_at = NOW()
        WHERE id = $4
        RETURNING *
      `;
      
      const updateValues = [
        userData.email || null,
        userData.displayName || null,
        userData.profileImage || null,
        existingUser.id
      ];
      
      const updateResult = await client.query(updateQuery, updateValues);
      
      return {
        success: true,
        data: mapPlatformUserFromDatabase(updateResult.rows[0]),
      };
    } else {
      // User doesn't exist, create it
      client = await getClient();
      const createQuery = `
        INSERT INTO "${PLATFORM_USERS_TABLE}" (
          id,
          auth_user_id,
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
        userData.platformAuthUserId,
        userData.email || null,
        userData.displayName || null,
        userData.profileImage || null
      ];
      
      const createResult = await client.query(createQuery, createValues);
      
      return {
        success: true,
        data: mapPlatformUserFromDatabase(createResult.rows[0]),
      };
    }
  } catch (error: any) {
    console.error('Error in getOrCreatePlatformUserByAuthId:', error);
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
