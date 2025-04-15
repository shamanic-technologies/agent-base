/**
 * User Credentials Service
 * 
 * Handles all database operations related to user credentials
 */
import { PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { getClient } from '../db.js';
import { 
  CreateOrUpdateCredentialsInput, 
  GetUserCredentialsInput,
  CredentialsResponse,
  DatabaseResponse,
  mapCredentialsToDatabase,
  mapCredentialsFromDatabase,
  DatabaseRecord,
  OAuth,
  ServiceResponse,
  CreateOrUpdateCredentialsInputItem
} from '@agent-base/types';

const COLLECTION_NAME = 'user_credentials';

/**
 * Create or update user credentials in the database.
 * Handles individual scopes by either updating an existing record for that scope
 * or inserting a new one.
 * @param input - The credentials data to create or update.
 * @returns A DatabaseResponse indicating success or failure.
 */
export async function createOrUpdateCredentials(
  input: CreateOrUpdateCredentialsInput
): Promise<DatabaseResponse> {
    let client: PoolClient | null = null;
    const { userId, oauthProvider, accessToken, refreshToken, expiresAt, scopes } = input;
    try {
        client = await getClient();
        // --- Start Fix ---
        // Ensure we use the correct property `dbInput.oauth_provider` which is mapped correctly
        // Also, ensure the `scope` column exists in the database table `user_credentials`
        // and that `dbInput.scopes` is correctly populated.
        if (!oauthProvider) {
            throw new Error('oauth_provider is missing after mapping credentials to database format.');
        }
        if (!Array.isArray(scopes)) {
            throw new Error('scopes is missing or not an array after mapping credentials to database format.');
        }
        // --- End Fix ---

        // Iterate through each scope provided and perform an UPSERT (update or insert)
        for (const scope of scopes) {
                  // Convert input to database format (snake_case)
            // The mapper correctly uses oauthProvider
            const inputItem = { userId, oauthProvider, accessToken, refreshToken, expiresAt, scope } as CreateOrUpdateCredentialsInputItem;
            const dbInputItem = mapCredentialsToDatabase(inputItem);
            // Check if a record exists for this user, provider, and scope
            const selectResult = await client.query(
                // Use correct column name `oauth_provider`
                `SELECT 1 FROM "${COLLECTION_NAME}" WHERE user_id = $1 AND oauth_provider = $2 AND scope = $3`,
                [
                    dbInputItem.user_id,
                    dbInputItem.oauth_provider, // Use correct mapped property
                    scope
                ]
            );

            if (selectResult.rows.length > 0) {
                // --- Record exists, UPDATE it ---
                await client.query(
                    // Use correct column name `oauth_provider`
                    `UPDATE "${COLLECTION_NAME}" 
                    SET access_token = $1, refresh_token = $2, expires_at = $3, updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = $4 AND oauth_provider = $5 AND scope = $6`,
                    [
                        dbInputItem.access_token,
                        dbInputItem.refresh_token,
                        dbInputItem.expires_at,
                        dbInputItem.user_id,
                        dbInputItem.oauth_provider, // Use correct mapped property
                        scope
                    ]
                );
            } else {
                // --- Record does not exist, INSERT it ---
                await client.query(
                    // Use correct column name `oauth_provider`
                    `INSERT INTO "${COLLECTION_NAME}" 
                    (user_id, oauth_provider, scope, access_token, refresh_token, expires_at)
                    VALUES ($1, $2, $3, $4, $5, $6)`,
                    [
                        dbInputItem.user_id,
                        dbInputItem.oauth_provider, // Use correct mapped property
                        scope,
                        dbInputItem.access_token,
                        dbInputItem.refresh_token,
                        dbInputItem.expires_at
                    ]
                );
            }
        }
        
        // If all scopes processed without error
        return {
            success: true,
        };

    } catch (error) {
        console.error('Error creating/updating credentials:', error);
        return {
            success: false,
            // Provide a more specific error message if possible
            error: error instanceof Error ? `Database error: ${error.message}` : 'Unknown database error occurred'
        };
    } finally {
        if (client) client.release(); // Release the client back to the pool
    }
}

/**
 * Get user credentials by user ID and provider, filtered by required scopes.
 * @param input - Contains userId, oauthProvider, and requiredScopes.
 * @returns A ServiceResponse containing an array of matching OAuth credentials or an error.
 */
export async function getCredentials(
  input: GetUserCredentialsInput
): Promise<ServiceResponse<OAuth[]>> {
  let client: PoolClient | null = null;
  try {
    client = await getClient();
    
    // Validate input
    if (!input.userId || !input.oauthProvider || !Array.isArray(input.requiredScopes) || input.requiredScopes.length === 0) {
        return {
            success: false,
            error: 'Invalid input: Missing userId, oauthProvider, or requiredScopes.',
        };
    }

    // Create placeholders for the IN clause (e.g., $3, $4, $5)
    const placeholders = input.requiredScopes.map((_, index) => `$${index + 3}`).join(', ');
    
    // Query for credentials matching the user, provider, and any of the required scopes
    const result = await client.query(
      // Use correct column name `oauth_provider`
      `SELECT * FROM "${COLLECTION_NAME}" 
       WHERE user_id = $1 AND oauth_provider = $2 AND scope IN (${placeholders}) 
       ORDER BY updated_at DESC`, // Optional: order by update time
      [input.userId, input.oauthProvider, ...input.requiredScopes]
    );

    // If no rows are found, return success with empty data (consistent with check-auth logic)
    if (result.rows.length === 0) {
      console.log(`No credentials found for user ${input.userId}, provider ${input.oauthProvider} matching scopes: ${input.requiredScopes.join(', ')}`);
      return {
        success: true, // Success, but no matching data
        data: []
      };
    }

    // Convert database result (snake_case) to application format (camelCase)
    // The mapper already handles snake_case to camelCase conversion correctly
    const credentials = result.rows.map(row => mapCredentialsFromDatabase(row as any)) as OAuth[]; // Use 'any' temporarily if DatabaseRecord type mismatches slightly

    return {
      success: true,
      data: credentials
    };
  } catch (error) {
    console.error('Error getting credentials:', error);
    return {
      success: false,
      error: error instanceof Error ? `Database error: ${error.message}` : 'Unknown database error occurred'
    };
  } finally {
    if (client) client.release(); // Release the client back to the pool
  }
}