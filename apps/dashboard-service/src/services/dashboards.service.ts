/**
 * Dashboard Service
 *
 * Handles business logic for dashboard operations, including creating,
 * retrieving, updating, and deleting dashboards from the database.
 */
import { getDbPool } from '../lib/db.js';
import {
  Dashboard,
  DashboardLayout,
  ServiceResponse,
  mapDashboardFromDatabase,
  dashboardLayoutSchema,
  DashboardInfo
} from '@agent-base/types';
import { ZodError } from 'zod';

interface DashboardAuth {
  clientUserId: string;
  clientOrganizationId: string;
}

/**
 * Formats a Zod validation error into a human-readable and AI-friendly string.
 * @param error - The ZodError object.
 * @returns A descriptive error message.
 */
function formatZodError(error: ZodError): string {
  const errorMessages = error.issues.map(issue => {
    // Create a user-friendly path string like "children[6].source"
    const path = issue.path.reduce<string>((acc, p) => {
        if (typeof p === 'number') return `${acc}[${p}]`;
        return acc ? `${acc}.${p}` : String(p);
    }, '');

    // Check for the most common error: using 'sql' instead of 'query'
    if (issue.code === 'invalid_union' && path.endsWith('source')) {
      return `Error in '${path}': Invalid data source. A 'source' object must contain either a 'query' key for SQL or a 'data' key for static data. You may have used 'sql' instead of 'query'.`;
    }
    
    // Provide a clear message for missing required properties
    if (issue.code === 'invalid_type' && issue.received === 'undefined') {
       return `Error in '${path}': A required property is missing.`;
    }

    // General fallback for other errors, making the path prominent
    return `Error in '${path}': ${issue.message}`;
  });

  // Use a Set to remove duplicate messages, which often occur with discriminated unions
  const uniqueMessages = [...new Set(errorMessages)];
  return `Validation Error(s): ${uniqueMessages.join('; ')}`;
}

/**
 * Creates a new dashboard in the database.
 * @param name - The name of the dashboard.
 * @param layout - The dashboard layout configuration.
 * @param auth - The user and organization identifiers.
 * @returns The newly created dashboard.
 */
export async function createDashboard(
  name: string,
  layout: DashboardLayout,
  auth: DashboardAuth
): Promise<ServiceResponse<Dashboard>> {
  try {
    // Validate the incoming layout against the Zod schema
    dashboardLayoutSchema.parse(layout);
  } catch (error) {
    if (error instanceof ZodError) {
      const friendlyError = formatZodError(error);
      console.error('Invalid dashboard layout:', friendlyError);
      return { success: false, error: 'Invalid dashboard layout provided.', details: friendlyError };
    }
    // Re-throw other errors to be caught by the main catch block
    throw error;
  }

  try {
    const pool = getDbPool();
    const query = `
      INSERT INTO dashboards (name, layout, client_user_id, client_organization_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const values = [name, JSON.stringify(layout), auth.clientUserId, auth.clientOrganizationId];
    const result = await pool.query(query, values);
    const newDashboard = mapDashboardFromDatabase(result.rows[0]);

    return { success: true, data: newDashboard };
  } catch (error: any) {
    console.error('Error creating dashboard:', error);
    // The Zod parsing is now handled above, so this catch is for database/other errors
    return { success: false, error: 'Failed to create dashboard.', details: error.message };
  }
}

/**
 * Retrieves summary information for all dashboards for a given user within a specific organization.
 * This does not include the large 'layout' field.
 * @param auth - The user and organization identifiers.
 * @returns A list of dashboard summaries.
 */
export async function getDashboardsInfo(auth: DashboardAuth): Promise<ServiceResponse<DashboardInfo[]>> {
  try {
    const pool = getDbPool();
    const query = 'SELECT id, name, client_user_id, client_organization_id, created_at, updated_at FROM dashboards WHERE client_user_id = $1 AND client_organization_id = $2 ORDER BY created_at DESC;';
    const result = await pool.query(query, [auth.clientUserId, auth.clientOrganizationId]);
    // The rows already match the DashboardInfo structure, so we just map them
    const dashboardsInfo = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      clientUserId: row.client_user_id,
      clientOrganizationId: row.client_organization_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return { success: true, data: dashboardsInfo };
  } catch (error: any) {
    console.error('Error getting dashboards info:', error);
    return { success: false, error: 'Failed to retrieve dashboards info.', details: error.message };
  }
}

/**
 * Retrieves a single dashboard by its ID, ensuring it belongs to the correct user and organization.
 * @param id - The ID of the dashboard to retrieve.
 * @param auth - The user and organization identifiers.
 * @returns The requested dashboard.
 */
export async function getDashboardById(id: string, auth: DashboardAuth): Promise<ServiceResponse<Dashboard>> {
  try {
    const pool = getDbPool();
    const query = 'SELECT * FROM dashboards WHERE id = $1 AND client_user_id = $2 AND client_organization_id = $3;';
    const result = await pool.query(query, [id, auth.clientUserId, auth.clientOrganizationId]);

    if (result.rows.length === 0) {
      return { success: false, error: 'Dashboard not found or you do not have permission to view it.' };
    }

    const dashboard = mapDashboardFromDatabase(result.rows[0]);
    return { success: true, data: dashboard };
  } catch (error: any) {
    console.error(`Error getting dashboard by id ${id}:`, error);
    return { success: false, error: 'Failed to retrieve dashboard.', details: error.message };
  }
}

/**
 * Updates an existing dashboard's name and/or layout.
 * @param id - The ID of the dashboard to update.
 * @param name - The new name for the dashboard (optional).
 * @param layout - The new layout for the dashboard (optional).
 * @param auth - The user and organization identifiers.
 * @returns The updated dashboard.
 */
export async function updateDashboard(
  id: string,
  name: string | undefined,
  layout: DashboardLayout | undefined,
  auth: DashboardAuth
): Promise<ServiceResponse<Dashboard>> {
  if (!name && !layout) {
    return { success: false, error: 'No update data provided. Please provide a new name or layout.' };
  }

  // Validate the layout if it's provided
  if (layout) {
    try {
      dashboardLayoutSchema.parse(layout);
    } catch (error) {
      if (error instanceof ZodError) {
        const friendlyError = formatZodError(error);
        console.error('Invalid dashboard layout:', friendlyError);
        return { success: false, error: 'Invalid dashboard layout provided.', details: friendlyError };
      }
      throw error;
    }
  }

  try {
    const pool = getDbPool();
    
    // Build the query dynamically
    const fieldsToUpdate: string[] = [];
    const values = [id, auth.clientUserId, auth.clientOrganizationId];
    
    if (name) {
      fieldsToUpdate.push(`name = $${values.length + 1}`);
      values.push(name);
    }
    if (layout) {
      fieldsToUpdate.push(`layout = $${values.length + 1}`);
      values.push(JSON.stringify(layout));
    }
    fieldsToUpdate.push('updated_at = current_timestamp');

    const query = `
      UPDATE dashboards
      SET ${fieldsToUpdate.join(', ')}
      WHERE id = $1 AND client_user_id = $2 AND client_organization_id = $3
      RETURNING *;
    `;
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return { success: false, error: 'Dashboard not found or you do not have permission to update it.' };
    }

    const updatedDashboard = mapDashboardFromDatabase(result.rows[0]);
    return { success: true, data: updatedDashboard };
  } catch (error: any) {
    console.error(`Error updating dashboard ${id}:`, error);
    return { success: false, error: 'Failed to update dashboard.', details: error.message };
  }
}

/**
 * Deletes a dashboard by its ID.
 * @param id - The ID of the dashboard to delete.
 * @param auth - The user and organization identifiers.
 * @returns A success message.
 */
export async function deleteDashboard(id: string, auth: DashboardAuth): Promise<ServiceResponse<{ message: string }>> {
  try {
    const pool = getDbPool();
    const query = 'DELETE FROM dashboards WHERE id = $1 AND client_user_id = $2 AND client_organization_id = $3 RETURNING id;';
    const result = await pool.query(query, [id, auth.clientUserId, auth.clientOrganizationId]);

    if (result.rows.length === 0) {
      return { success: false, error: 'Dashboard not found or you do not have permission to delete it.' };
    }

    return { success: true, data: { message: 'Dashboard deleted successfully.' } };
  } catch (error: any) {
    console.error(`Error deleting dashboard ${id}:`, error);
    return { success: false, error: 'Failed to delete dashboard.', details: error.message };
  }
} 