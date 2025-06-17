/**
 * Client Organizations Service
 * 
 * Handles all database operations related to client organizations.
 * Client organizations represent the end-users interacting with agents via different platforms.
 */
import { PoolClient } from 'pg';
import { getClient } from '../db.js';
import {
  ClientOrganization, // Assuming this type exists in @agent-base/types and includes platformUserId, platformClientUserId
  UpsertClientOrganizationInput,
  ServiceResponse,
  mapClientUserFromDatabase,
} from '@agent-base/types';
import { mapClientOrganizationFromDatabase } from '@agent-base/types';
import { 
  CLIENT_ORGANIZATIONS_TABLE, 
  CLIENT_USERS_TABLE,
  CLIENT_USER_CLIENT_ORGANIZATION_TABLE 
} from '../types/database-constants.js';
import { upsertClientUser } from './client-users.js'; // Import upsertClientUser

/**
 * Creates or updates a client organization record.
 * If an organization with the given authOrganizationId exists, it updates its name and profile image.
 * Otherwise, it creates a new record.
 * The platformUserId is used to identify the creator of the organization.
 * 
 * @param {UpsertClientOrganizationInput} input - The details of the client organization.
 *        Expected fields: platformUserId (for creator), authOrganizationId (unique ID of org), name, profileImage (optional).
 * @returns {Promise<ServiceResponse<ClientOrganization>>} A response containing the data of the created or updated client organization.
 */
export async function upsertClientOrganization(input: UpsertClientOrganizationInput): Promise<ServiceResponse<ClientOrganization>> {
  let client: PoolClient | null = null;
  
  // Validate input - Assuming UpsertClientOrganizationInput is updated in @agent-base/types
  // to include name, and authOrganizationId is the unique key for the org.
  // platformUserId is needed to link/create the creator client_user.
  if (!input || !input.creatorClientUserId || !input.clientAuthOrganizationId) {
    const missingFields = [];
    if (!input.creatorClientUserId) missingFields.push('creatorClientUserId (for creator)');
    if (!input.clientAuthOrganizationId) missingFields.push('clientAuthOrganizationId (for client_auth_organization_id)');
    
    console.error(`[Upsert Client Org] Missing required fields: ${missingFields.join(', ')}`);
    return {
      success: false,
      error: `Missing required fields: ${missingFields.join(', ')}`
    };
  }

  try {
    client = await getClient();
    await client.query('BEGIN'); // Start transaction

    // Step 2: Upsert the organization using client_auth_organization_id as the conflict target
    const upsertOrgQuery = `
      INSERT INTO "${CLIENT_ORGANIZATIONS_TABLE}" (
        name, 
        profile_image, 
        creator_client_user_id, 
        client_auth_organization_id, 
        created_at, 
        updated_at
      )
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      ON CONFLICT (client_auth_organization_id) DO UPDATE SET
        name = EXCLUDED.name,
        profile_image = COALESCE(EXCLUDED.profile_image, "${CLIENT_ORGANIZATIONS_TABLE}".profile_image),
        -- creator_client_user_id should generally not change on conflict if org already exists
        updated_at = NOW()
      RETURNING *;
    `;


    const orgResult = await client.query(upsertOrgQuery, [
      input.name || 'Personal',
      input.profileImage, // Can be null if optional
      input.creatorClientUserId,
      input.clientAuthOrganizationId, // This maps to client_auth_organization_id
    ]);

    if (orgResult.rowCount === 0 || !orgResult.rows[0]) {
      await client.query('ROLLBACK');
      console.error('[Upsert Client Org] Failed to upsert client organization record after user processing.');
      return { success: false, error: 'Failed to save client organization record.' };
    }

    const organizationId = orgResult.rows[0].id;

    // Step 3: Link the creator user to the organization in the junction table
    const linkUserToOrgQuery = `
      INSERT INTO "${CLIENT_USER_CLIENT_ORGANIZATION_TABLE}" (client_user_id, client_organization_id)
      VALUES ($1, $2)
      ON CONFLICT (client_user_id, client_organization_id) DO NOTHING;
    `;
    await client.query(linkUserToOrgQuery, [input.creatorClientUserId, organizationId]);

    await client.query('COMMIT'); // Commit transaction
    
    const upsertedOrganization = mapClientOrganizationFromDatabase(orgResult.rows[0]);
    
    return {
      success: true,
      data: upsertedOrganization,
    };
  } catch (error: any) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rbError) {
        console.error('[Upsert Client Org] Error during ROLLBACK:', rbError);
      }
    }
    console.error('[Upsert Client Org] Error during operation:', error);
    // Check for specific known error codes if necessary, e.g., foreign key violation if creator_client_user_id is somehow invalid
    return {
      success: false,
      error: error.message || 'Failed to upsert client organization due to an internal error.',
    };
  } finally {
    if (client) {
      client.release();
    }
  }
}

export interface UpdateClientOrganizationInput {
  name?: string;
  profileImage?: string;
}

/**
 * Updates an organization's details.
 * Only the user who created the organization can update it.
 *
 * @param {string} organizationId - The ID of the organization to update.
 * @param {string} clientUserId - The ID of the user attempting the update.
 * @param {UpdateClientOrganizationInput} updates - The fields to update.
 * @returns {Promise<ServiceResponse<ClientOrganization>>} The updated organization data.
 */
export async function updateClientOrganization(
  organizationId: string,
  clientUserId: string,
  updates: UpdateClientOrganizationInput
): Promise<ServiceResponse<ClientOrganization>> {
  let client: PoolClient | null = null;
  try {
    client = await getClient();
    const query = `
      UPDATE "${CLIENT_ORGANIZATIONS_TABLE}"
      SET
        name = COALESCE($1, name),
        profile_image = COALESCE($2, profile_image),
        updated_at = NOW()
      WHERE id = $3 AND creator_client_user_id = $4
      RETURNING *;
    `;
    const result = await client.query(query, [updates.name, updates.profileImage, organizationId, clientUserId]);

    if (result.rowCount === 0) {
      return { success: false, error: 'Organization not found or user is not the creator.' };
    }

    return { success: true, data: mapClientOrganizationFromDatabase(result.rows[0]) };
  } catch (error: any) {
    console.error(`Error updating organization ${organizationId}:`, error);
    return { success: false, error: 'Failed to update organization.' };
  } finally {
    if (client) client.release();
  }
}

/**
 * Deletes an organization.
 * Only the user who created the organization can delete it.
 *
 * @param {string} organizationId - The ID of the organization to delete.
 * @param {string} clientUserId - The ID of the user attempting the deletion.
 * @returns {Promise<ServiceResponse<boolean>>} Success status.
 */
export async function deleteClientOrganization(
  organizationId: string,
  clientUserId: string
): Promise<ServiceResponse<boolean>> {
  let client: PoolClient | null = null;
  try {
    client = await getClient();
    const query = `
      DELETE FROM "${CLIENT_ORGANIZATIONS_TABLE}"
      WHERE id = $1 AND creator_client_user_id = $2;
    `;
    const result = await client.query(query, [organizationId, clientUserId]);

    if (result.rowCount === 0) {
      return { success: false, error: 'Organization not found or user is not the creator.' };
    }

    return { success: true, data: true };
  } catch (error: any) {
    console.error(`Error deleting organization ${organizationId}:`, error);
    return { success: false, error: 'Failed to delete organization.' };
  } finally {
    if (client) client.release();
  }
} 