/**
 * API Keys Service
 * 
 * Handles all database operations related to API keys
 */
import { PoolClient } from 'pg';
import { pgPool, getClient } from '../db.js';
import { ApiKeyMetadata, CreateApiKeyRequest, ApiKeyResponse, ApiKeysListResponse, UpdateApiKeyRequest } from '@agent-base/agents/src/types/api-keys.js';

// Table name constant
const API_KEYS_TABLE = 'api_keys';

/**
 * Creates API key metadata in the database
 * @param keyData - The API key data to insert
 * @param userId - The user ID who owns the key
 * @returns A response with the created API key metadata
 */
export async function createApiKey(keyData: CreateApiKeyRequest, userId: string): Promise<ApiKeyResponse> {
  let client: PoolClient | null = null;
  
  try {
    client = await getClient();
    
    // Prepare data for insertion
    const apiKeyData: ApiKeyMetadata = {
      key_id: keyData.key_id,
      user_id: userId,
      name: keyData.name,
      key_prefix: keyData.key_prefix,
      hashed_key: keyData.hashed_key,
      created_at: new Date().toISOString(),
      last_used: null,
    };

    // Build insert query
    const columns = ['key_id', 'user_id', 'name', 'key_prefix', 'hashed_key', 'created_at'];
    const values = [apiKeyData.key_id, apiKeyData.user_id, apiKeyData.name, apiKeyData.key_prefix, apiKeyData.hashed_key, apiKeyData.created_at];
    const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');

    const query = `
      INSERT INTO "${API_KEYS_TABLE}" (${columns.map(c => `"${c}"`).join(', ')})
      VALUES (${placeholders})
      RETURNING *;
    `;

    const result = await client.query<ApiKeyMetadata>(query, values);

    return {
      success: true,
      data: result.rows[0]
    };
  } catch (error: any) {
    console.error('Error creating API key:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to create API key'
    };
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
export async function getApiKeys(userId: string, keyPrefix?: string): Promise<ApiKeysListResponse> {
  let client: PoolClient | null = null;
  
  try {
    client = await getClient();
    
    let query = `
      SELECT key_id, user_id, name, key_prefix, hashed_key, created_at, last_used
      FROM "${API_KEYS_TABLE}"
      WHERE user_id = $1
    `;
    const queryParams: any[] = [userId];

    // Add key_prefix filter if provided
    if (keyPrefix) {
      queryParams.push(keyPrefix);
      query += ` AND key_prefix = $${queryParams.length}`;
    }

    query += ` ORDER BY created_at DESC;`;

    const result = await client.query<ApiKeyMetadata>(query, queryParams);

    return {
      success: true,
      data: result.rows
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
export async function updateApiKey(hashedKey: string, keyPrefix: string): Promise<ApiKeyResponse> {
  let client: PoolClient | null = null;
  
  try {
    client = await getClient();
    
    // Find the API key by its hashed value and prefix
    const findQuery = `
      SELECT * FROM "${API_KEYS_TABLE}" 
      WHERE hashed_key = $1
      AND key_prefix = $2
    `;
    
    const findResult = await client.query<ApiKeyMetadata>(findQuery, [hashedKey, keyPrefix]);
    
    if (findResult.rows.length === 0) {
      return {
        success: false,
        error: 'Invalid API key'
      };
    }
    
    // Update the last_used timestamp
    const now = new Date().toISOString();
    const updateQuery = `
      UPDATE "${API_KEYS_TABLE}"
      SET last_used = $1
      WHERE hashed_key = $2
      AND key_prefix = $3
      RETURNING *;
    `;
    
    const result = await client.query<ApiKeyMetadata>(updateQuery, [now, hashedKey, keyPrefix]);
    
    return {
      success: true,
      data: result.rows[0]
    };
  } catch (error: any) {
    console.error('Error updating API key usage:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to update API key usage'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
}