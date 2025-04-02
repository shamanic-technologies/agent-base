/**
 * User Credentials Service
 * 
 * Handles all database operations related to user credentials
 */
import { PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { getClient } from '../db.js';
import { 
  Credential,
  CreateOrUpdateCredentialsInput, 
  GetUserCredentialsInput,
  CredentialsResponse,
  DatabaseResponse,
  mapToDatabase,
  mapFromDatabase,
  DatabaseRecord
} from '@agent-base/credentials';

const COLLECTION_NAME = 'user_credentials';

/**
 * Create user credentials in the database
 */
export async function createOrUpdateCredentials(
  input: CreateOrUpdateCredentialsInput
): Promise<DatabaseResponse> {
    let client: PoolClient | null = null;
    try {
        client = await getClient();
    
        // Create table if it doesn't exist
        await client.query(`
        CREATE TABLE IF NOT EXISTS "${COLLECTION_NAME}" (
            user_id VARCHAR(255) NOT NULL,
            provider VARCHAR(50) NOT NULL,
            scope TEXT NOT NULL,
            access_token TEXT NOT NULL,
            refresh_token TEXT NOT NULL,
            expires_at BIGINT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, provider, scope)
        )
        `);

        // Convert input to database format
        const dbInput = mapToDatabase(input);

        for (const scope of dbInput.scopes) {
            const result = await client.query(
                `SELECT * FROM "${COLLECTION_NAME}" WHERE user_id = $1 AND provider = $2 AND scope = $3`,
                [
                    dbInput.user_id,
                    dbInput.provider,
                    scope
                ]
            );
            if (result.rows.length > 0) {
                // Update existing credentials
                await client.query(
                    `UPDATE "${COLLECTION_NAME}" 
                    SET access_token = $1, refresh_token = $2, expires_at = $3, updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = $4 AND provider = $5 AND scope = $6`,
                    [
                        dbInput.access_token,
                        dbInput.refresh_token,
                        dbInput.expires_at,
                        dbInput.user_id,
                        dbInput.provider,
                        scope
                    ]
                );
            } else {
                // Insert new credentials
                await client.query(
                `INSERT INTO "${COLLECTION_NAME}" 
                (user_id, provider, scope, access_token, refresh_token, expires_at)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *`,
                [
                    dbInput.user_id,
                    dbInput.provider,
                    scope,
                    dbInput.access_token,
                    dbInput.refresh_token,
                    dbInput.expires_at
                ]
            
                );
            }
        }
        return {
            success: true,
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
  input: GetUserCredentialsInput
): Promise<CredentialsResponse<Credential[]>> {
  let client: PoolClient | null = null;
  try {
    client = await getClient();
    
    // Handle the array of required scopes properly
    const placeholders = input.requiredScopes.map((_, index) => `$${index + 3}`).join(', ');
    
    const result = await client.query(
      `SELECT * FROM "${COLLECTION_NAME}" WHERE user_id = $1 AND provider = $2 AND scope IN (${placeholders})`,
      [input.userId, input.provider, ...input.requiredScopes]
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'Credentials not found'
      };
    }

    // Convert database result to application format
    const credentials = result.rows.map(mapFromDatabase) as Credential[];

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

// /**
//  * Update user credentials
//  */
// export async function updateCredentials(
//   userId: string,
//   input: UpdateCredentialsInput
// ): Promise<DatabaseResponse<Credentials>> {
//   let client: PoolClient | null = null;
//   try {
//     client = await getClient();
    
//     // Convert input to database format
//     const dbInput = mapToDatabase(input);
    
//     // Build the SQL update statement dynamically based on provided fields
//     const updateFields = [];
//     const params: any[] = [];
//     let paramIndex = 1;
    
//     if (dbInput.access_token !== undefined) {
//       updateFields.push(`access_token = $${paramIndex++}`);
//       params.push(dbInput.access_token);
//     }
    
//     if (dbInput.expires_at !== undefined) {
//       updateFields.push(`expires_at = $${paramIndex++}`);
//       params.push(dbInput.expires_at);
//     }
    
//     if (dbInput.scopes !== undefined) {
//       updateFields.push(`scopes = $${paramIndex++}`);
//       params.push(dbInput.scopes);
//     }
    
//     // Always update the updated_at timestamp
//     updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    
//     // No fields to update
//     if (updateFields.length === 1) {
//       throw new Error('No fields to update');
//     }
    
//     // Add the userId as the last parameter
//     params.push(userId);
    
//     const result = await client.query(
//       `UPDATE "${COLLECTION_NAME}"
//        SET ${updateFields.join(', ')}
//        WHERE user_id = $${paramIndex}
//        RETURNING *`,
//       params
//     );

//     if (result.rows.length === 0) {
//       return {
//         success: false,
//         error: 'Credentials not found'
//       };
//     }

//     // Convert database result to application format
//     const credentials = mapFromDatabase(result.rows[0] as DatabaseRecord);

//     return {
//       success: true,
//       data: credentials
//     };
//   } catch (error) {
//     console.error('Error updating credentials:', error);
//     return {
//       success: false,
//       error: error instanceof Error ? error.message : 'Unknown error occurred'
//     };
//   } finally {
//     if (client) client.release();
//   }
// } 