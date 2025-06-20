/**
 * Dashboards Service
 * 
 * Handles all database operations related to dashboards.
 */
import { PoolClient } from 'pg';
import { getClient } from '../db.js';
import { 
    Dashboard,
    DashboardFileTree, 
    dashboardFileTreeSchema,
    ServiceResponse,
    DashboardInfo,
    mapDashboardFromDatabase,
} from '@agent-base/types';
import { DASHBOARDS_TABLE } from '../types/database-constants.js';

interface CreateDashboardInput {
    name: string;
    clientUserId: string;
    clientOrganizationId: string;
    webContainerConfig: DashboardFileTree;
}

/**
 * Creates a new dashboard record in the database.
 * 
 * @param {CreateDashboardInput} input - The details of the dashboard to create.
 * @returns {Promise<ServiceResponse<Dashboard>>} A response containing the data of the created dashboard.
 */
export async function createDashboard(input: CreateDashboardInput): Promise<ServiceResponse<Dashboard>> {
    let client: PoolClient | null = null;
    const { name, clientUserId, clientOrganizationId, webContainerConfig } = input;

    // --- Basic Validation ---
    if (!name || !clientUserId || !clientOrganizationId || !webContainerConfig) {
        return { 
            success: false,
            error: 'Missing required fields: name, clientUserId, clientOrganizationId, webContainerConfig'
        };
    }

    // --- Zod Schema Validation ---
    const validationResult = dashboardFileTreeSchema.safeParse(webContainerConfig);
    if (!validationResult.success) {
        return { 
            success: false,
            error: "Invalid webContainerConfig structure.", 
            details: JSON.stringify(validationResult.error.flatten())
        };
    }
    
    try {
        client = await getClient();
        const queryText = `
            INSERT INTO ${DASHBOARDS_TABLE} (name, client_user_id, client_organization_id, web_container_config)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;
        const values = [name, clientUserId, clientOrganizationId, validationResult.data];
        
        const result = await client.query(queryText, values);
        const newDashboard = result.rows[0];

        // Map the database record before returning
        return {
            success: true,
            data: mapDashboardFromDatabase(newDashboard)
        };

    } catch (error: any) {
        console.error('Error creating dashboard:', error);
        return {
            success: false,
            error: 'Failed to create dashboard in database',
            details: error.message
        };
    } finally {
        if (client) {
            client.release();
        }
    }
}

/**
 * Retrieves all dashboards for a given user and organization, excluding the web_container_config.
 * 
 * @param {string} clientUserId - The ID of the client user.
 * @param {string} clientOrganizationId - The ID of the client organization.
 * @returns {Promise<ServiceResponse<DashboardInfo[]>>} A list of dashboards without the config.
 */
export async function getDashboardsForUserAndOrganization(clientUserId: string, clientOrganizationId: string): Promise<ServiceResponse<DashboardInfo[]>> {
    let client: PoolClient | null = null;

    if (!clientUserId || !clientOrganizationId) {
        return { success: false, error: 'clientUserId and clientOrganizationId are required' };
    }
    
    try {
        client = await getClient();
        // Select all columns EXCEPT web_container_config
        const queryText = `
            SELECT id, name, client_user_id, client_organization_id, created_at, updated_at
            FROM ${DASHBOARDS_TABLE}
            WHERE client_user_id = $1 AND client_organization_id = $2
            ORDER BY created_at DESC;
        `;
        
        const result = await client.query(queryText, [clientUserId, clientOrganizationId]);
        
        // Map each row before returning
        return {
            success: true,
            data: result.rows.map(mapDashboardFromDatabase)
        };

    } catch (error: any) {
        console.error('Error getting dashboards for user and organization:', error);
        return {
            success: false,
            error: 'Failed to get dashboards',
            details: error.message
        };
    } finally {
        if (client) {
            client.release();
        }
    }
}

/**
 * Retrieves a single dashboard by its ID, including the web_container_config.
 * 
 * @param {string} dashboardId - The ID of the dashboard to retrieve.
 * @returns {Promise<ServiceResponse<Dashboard>>} The full dashboard object.
 */
export async function getDashboardById(dashboardId: string): Promise<ServiceResponse<Dashboard>> {
    let client: PoolClient | null = null;

    if (!dashboardId) {
        return { success: false, error: 'dashboardId is required' };
    }

    try {
        client = await getClient();
        const queryText = `SELECT * FROM ${DASHBOARDS_TABLE} WHERE id = $1;`;
        
        const result = await client.query(queryText, [dashboardId]);

        if (result.rowCount === 0) {
            return { success: false, error: 'Dashboard not found' };
        }
        
        // Map the database record before returning
        return {
            success: true,
            data: mapDashboardFromDatabase(result.rows[0])
        };

    } catch (error: any) {
        console.error('Error getting dashboard by ID:', error);
        return {
            success: false,
            error: 'Failed to get dashboard by ID',
            details: error.message
        };
    } finally {
        if (client) {
            client.release();
        }
    }
} 