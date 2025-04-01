/**
 * User Credentials Service
 * 
 * Handles all database operations related to user credentials
 */
import { PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { getClient } from '../db';
import { 
  Credentials,
  CreateCredentialsInput, 
  UpdateCredentialsInput, 
  CredentialsResponse,
  DatabaseRecord,
  mapToDatabase,
  mapFromDatabase
} from '@agent-base/credentials';

const COLLECTION_NAME = 'user_credentials';

/**
 * Create user credentials in the database
 */
export async function createCredentials(
  input: CreateCredentialsInput
): Promise<CredentialsResponse<Credentials>> {
  let client: PoolClient | null = null;
  try {
    client = await getClient();
    
    // Create table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS "${COLLECTION_NAME}" (
        id UUID PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL UNIQUE,
        provider VARCHAR(50) NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        expires_at BIGINT NOT NULL,
        scopes TEXT[] NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Convert input to database format
    const dbInput = mapToDatabase(input);

    // Insert new credentials
    const result = await client.query(
      `INSERT INTO "${COLLECTION_NAME}" 
       (id, user_id, provider, access_token, refresh_token, expires_at, scopes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        uuidv4(),
        dbInput.user_id,
        dbInput.provider,
        dbInput.access_token,
        dbInput.refresh_token,
        dbInput.expires_at,
        dbInput.scopes
      ]
    );

    // Convert database result to application format
    const credentials = mapFromDatabase(result.rows[0] as DatabaseRecord);

    return {
      success: true,
      data: credentials
    };
  } catch (error) {
    console.error('Error creating credentials:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  } finally {
    if (client) client.release();
  }
}

/**
 * Get user credentials by user ID
 */
export async function getCredentials(
  userId: string
): Promise<CredentialsResponse<Credentials>> {
  let client: PoolClient | null = null;
  try {
    client = await getClient();
    
    const result = await client.query(
      `SELECT * FROM "${COLLECTION_NAME}" WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'Credentials not found'
      };
    }

    // Convert database result to application format
    const credentials = mapFromDatabase(result.rows[0] as DatabaseRecord);

    return {
      success: true,
      data: credentials
    };
  } catch (error) {
    console.error('Error getting credentials:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  } finally {
    if (client) client.release();
  }
}

/**
 * Update user credentials
 */
export async function updateCredentials(
  userId: string,
  input: UpdateCredentialsInput
): Promise<CredentialsResponse<Credentials>> {
  let client: PoolClient | null = null;
  try {
    client = await getClient();
    
    // Convert input to database format
    const dbInput = mapToDatabase(input);
    
    // Build the SQL update statement dynamically based on provided fields
    const updateFields = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    if (dbInput.access_token !== undefined) {
      updateFields.push(`access_token = $${paramIndex++}`);
      params.push(dbInput.access_token);
    }
    
    if (dbInput.expires_at !== undefined) {
      updateFields.push(`expires_at = $${paramIndex++}`);
      params.push(dbInput.expires_at);
    }
    
    if (dbInput.scopes !== undefined) {
      updateFields.push(`scopes = $${paramIndex++}`);
      params.push(dbInput.scopes);
    }
    
    // Always update the updated_at timestamp
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    
    // No fields to update
    if (updateFields.length === 1) {
      throw new Error('No fields to update');
    }
    
    // Add the userId as the last parameter
    params.push(userId);
    
    const result = await client.query(
      `UPDATE "${COLLECTION_NAME}"
       SET ${updateFields.join(', ')}
       WHERE user_id = $${paramIndex}
       RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'Credentials not found'
      };
    }

    // Convert database result to application format
    const credentials = mapFromDatabase(result.rows[0] as DatabaseRecord);

    return {
      success: true,
      data: credentials
    };
  } catch (error) {
    console.error('Error updating credentials:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  } finally {
    if (client) client.release();
  }
} 