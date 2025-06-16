/**
 * User Credentials Service
 * 
 * Handles all database operations related to user credentials
 */
import { PoolClient } from 'pg';
import { getClient } from '../db.js';
import { 
  OAuth,
  ServiceResponse,
  CreateOrUpdateOAuthInput,
  mapOAuthFromDatabase,
  GetUserOAuthInput,
  OAuthRecord,
  InternalCredentials
} from '@agent-base/types';
import { CLIENT_USER_OAUTH_TABLE } from '../types/database-constants.js';
/**
 * Create or update user credentials in the database.
 * Handles individual scopes by either updating an existing record for that scope
 * or inserting a new one.
 * @param input - The credentials data to create or update.
 * @returns A DatabaseResponse indicating success or failure.
 */
export async function createOrUpdateOAuth(
  input: CreateOrUpdateOAuthInput,
  internalCredentials: InternalCredentials
): Promise<ServiceResponse<string>> {
    let client: PoolClient | null = null;
    const { oauthProvider, accessToken, refreshToken, expiresAt, scopes } = input;
    const { clientUserId, clientOrganizationId } = internalCredentials;
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
            // Check if a record exists for this user, provider, and scope
            const selectResult = await client.query(
                // Use correct column name `oauth_provider`
                `SELECT 1 FROM "${CLIENT_USER_OAUTH_TABLE}" WHERE client_user_id = $1 AND client_organization_id = $2 AND oauth_provider = $3 AND scope = $4`,
                [
                    clientUserId,
                    clientOrganizationId,
                    oauthProvider,
                    scope
                ]
            );

            if (selectResult.rows.length > 0) {
                // --- Record exists, UPDATE it ---
                await client.query(
                    // Use correct column name `oauth_provider`
                    `UPDATE "${CLIENT_USER_OAUTH_TABLE}" 
                    SET access_token = $1, refresh_token = $2, expires_at = $3, updated_at = CURRENT_TIMESTAMP
                    WHERE client_user_id = $4 AND client_organization_id = $5 AND oauth_provider = $6 AND scope = $7`,
                    [
                        accessToken,
                        refreshToken,
                        expiresAt,
                        clientUserId,
                        clientOrganizationId,
                        oauthProvider, // Use correct mapped property
                        scope
                    ]
                );
            } else {
                // --- Record does not exist, INSERT it ---
                await client.query(
                    // Use correct column name `oauth_provider`
                    `INSERT INTO "${CLIENT_USER_OAUTH_TABLE}" 
                    (client_user_id, client_organization_id, oauth_provider, scope, access_token, refresh_token, expires_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [
                        clientUserId,
                        clientOrganizationId,
                        oauthProvider, // Use correct mapped property
                        scope,
                        accessToken,
                        refreshToken,
                        expiresAt
                    ]
                );
            }
        }
        
        // If all scopes processed without error
        return {
            success: true,
            data: 'Successfully created/updated OAuth credentials'
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
  input: GetUserOAuthInput,
  internalCredentials: InternalCredentials
): Promise<ServiceResponse<OAuth[]>> {
  let client: PoolClient | null = null;
  try {
    client = await getClient();
    const { clientUserId, clientOrganizationId } = internalCredentials;
    // Validate input
    if (!clientUserId || !clientOrganizationId || !input.oauthProvider || !Array.isArray(input.requiredScopes) || input.requiredScopes.length === 0) {
        console.error('[DB Service/getCredentials] Invalid input: Missing clientUserId, clientOrganizationId, oauthProvider, or requiredScopes.');
        return {
            success: false,
            error: 'Invalid input: Missing clientUserId, clientOrganizationId, oauthProvider, or requiredScopes.',
            hint: 'This error should not happen. Contact support.'
        };
    }

    // Create placeholders for the IN clause (e.g., $3, $4, $5)
    const placeholders = input.requiredScopes.map((_, index) => `$${index + 4}`).join(', ');
    
    // Query for credentials matching the user, provider, and any of the required scopes
    const result = await client.query(
      // Use correct column name `oauth_provider`
      `SELECT * FROM "${CLIENT_USER_OAUTH_TABLE}" 
       WHERE client_user_id = $1 AND client_organization_id = $2 AND oauth_provider = $3 AND scope IN (${placeholders}) 
       ORDER BY updated_at DESC`, // Optional: order by update time
        [clientUserId, clientOrganizationId, input.oauthProvider, ...input.requiredScopes]
    );

    // If no rows are found, return success with empty data (consistent with check-auth logic)
    if (result.rows.length === 0) {
      return {
        success: true, // Success, but no matching data
        data: []
      };
    }

    // Convert database result (snake_case) to application format (camelCase)
    // The mapper already handles snake_case to camelCase conversion correctly
    const oauth_credentials: OAuth[] = result.rows.map(row => mapOAuthFromDatabase(row as OAuthRecord)); // Use 'any' temporarily if DatabaseRecord type mismatches slightly

    return {
      success: true,
      data: oauth_credentials
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