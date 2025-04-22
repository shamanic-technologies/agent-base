/**
 * API Keys Service
 * 
 * Handles all database operations related to API keys
 */
import { PoolClient } from 'pg';
import { pgPool, getClient } from '../db.js';
import { ApiKeyRecord,
  CreateApiKeyRequest,
  ApiKey, 
  SuccessResponse, 
  ErrorResponse, 
  ServiceResponse, 
  mapAPIKeyFromDatabase,
  ValidateApiKeyRequest } from '@agent-base/types';

// Table name constant
const PLATFORM_USER_API_KEY_TABLE = 'platform_user_api_keys';

/**
 * Creates or updates API key metadata in the database (Upsert)
 * If a key with the same key_id exists, it updates the name and hashed_key.
 * @param keyData - The API key data to insert or update
 * @param userId - The user ID who owns the key
 * @returns A response with the created or updated API key metadata
 */
export async function upsertApiKey(keyData: CreateApiKeyRequest, userId: string):
Promise<ServiceResponse<ApiKey>> {
  let client: PoolClient | null = null;
  
  try {
    client = await getClient();
    
    // Prepare data for insertion
    const apiKeyData: ApiKeyRecord = {
      key_id: keyData.keyId,
      platform_user_id: userId,
      name: keyData.name,
      key_prefix: keyData.keyPrefix,
      hashed_key: keyData.hashedKey,
      created_at: new Date().toISOString(),
      last_used: null,
    };

    // Build insert query
    const columns = ['key_id', 'platform_user_id', 'name', 'key_prefix', 'hashed_key', 'created_at'];
    const values = [apiKeyData.key_id, apiKeyData.platform_user_id, apiKeyData.name, apiKeyData.key_prefix, apiKeyData.hashed_key, apiKeyData.created_at];
    const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');

    const query = `
      INSERT INTO "${PLATFORM_USER_API_KEY_TABLE}" (${columns.map(c => `"${c}"`).join(', ')})
      VALUES (${placeholders})
      ON CONFLICT (platform_user_id, name) DO UPDATE SET
        key_id = EXCLUDED.key_id,
        key_prefix = EXCLUDED.key_prefix,
        hashed_key = EXCLUDED.hashed_key
      RETURNING *;
    `;

    const result = await client.query<ApiKeyRecord>(query, values);

    return {
      success: true,
      data: mapAPIKeyFromDatabase(result.rows[0])
    } as SuccessResponse<ApiKey>;
  } catch (error: any) {
    console.error('Error creating API key:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to create API key'
    } as ErrorResponse;
  } finally {
    if (client) {
      client.release();
    }
  }
}

/**
 * Gets all API keys for a specific user
 * @param userId - The user ID to get keys for
 * @param keyPrefix - Optional key prefix to filter by
 * @returns A response with an array of API key metadata
 */
export async function getApiKeys(userId: string, keyPrefix?: string): Promise<ServiceResponse<ApiKey[]>> {
  let client: PoolClient | null = null;
  
  try {
    client = await getClient();
    
    let query = `
      SELECT key_id, platform_user_id, name, key_prefix, hashed_key, created_at, last_used
      FROM "${PLATFORM_USER_API_KEY_TABLE}"
      WHERE platform_user_id = $1
    `;
    const queryParams: any[] = [userId];

    // Add key_prefix filter if provided
    if (keyPrefix) {
      queryParams.push(keyPrefix);
      query += ` AND key_prefix = $${queryParams.length}`;
    }

    query += ` ORDER BY created_at DESC;`;

    const result = await client.query<ApiKeyRecord>(query, queryParams);

    return {
      success: true,
      data: result.rows.map(mapAPIKeyFromDatabase)
    };
  } catch (error: any) {
    console.error('Error fetching API keys:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to fetch API keys'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
}

/**
 * Updates the last_used timestamp for an API key
 * @param hashedKey - The hashed API key to identify the record
 * @param keyPrefix - The key prefix for additional filtering
 * @returns A response with the updated API key metadata
 */
export async function validateApiKey(input: ValidateApiKeyRequest): Promise<ServiceResponse<ApiKey>> {
  let client: PoolClient | null = null;
  const { hashedKey, keyPrefix } = input;
  try {
    client = await getClient();
    
    // Find the API key by its hashed value and prefix
    const findQuery = `
      SELECT * FROM "${PLATFORM_USER_API_KEY_TABLE}" 
      WHERE hashed_key = $1
      AND key_prefix = $2
    `;
    
    const findResult = await client.query<ApiKeyRecord>(findQuery, [hashedKey, keyPrefix]);
    
    if (findResult.rows.length === 0) {
      return {
        success: false,
        error: 'Invalid API key'
      } as ErrorResponse;
    }
    
    // Update the last_used timestamp
    const now = new Date().toISOString();
    const updateQuery = `
      UPDATE "${PLATFORM_USER_API_KEY_TABLE}"
      SET last_used = $1
      WHERE hashed_key = $2
      AND key_prefix = $3
      RETURNING *;
    `;
    
    const result = await client.query<ApiKeyRecord>(updateQuery, [now, hashedKey, keyPrefix]);
    
    return {
      success: true,
      data: mapAPIKeyFromDatabase(result.rows[0])
    } as SuccessResponse<ApiKey>;
  } catch (error: any) {
    console.error('Error updating API key usage:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to update API key usage',
    } as ErrorResponse;
  } finally {
    if (client) {
      client.release();
    }
  }
}