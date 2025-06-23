import { z } from 'zod';
import { dashboardBlockConfigSchema, DashboardLayout } from '../schemas/dashboard.schema.js';

/**
 * Represents a dashboard record as it is stored in the database.
 */
export interface DashboardInfo {
    id: string; // uuid
    name: string;
    clientUserId: string;
    clientOrganizationId: string;
    createdAt: string; // ISO date string
    updatedAt: string; // ISO date string
}


export interface CreateDashboardRequest {
  name: string;
  layout: DashboardLayout;
}


export interface Dashboard extends DashboardInfo {
  layout: DashboardLayout;
}

/**
 * Maps a dashboard record from its snake_case database representation
 * to the camelCase API representation.
 * @param {any} row - The raw row object from the database.
 * @returns {Dashboard} The mapped Dashboard object.
 */
export function mapDashboardFromDatabase(row: any): Dashboard {
    if (!row) {
        throw new Error("Invalid database row for dashboard mapping.");
    }
    return {
        id: row.id,
        name: row.name,
        clientUserId: row.client_user_id,
        clientOrganizationId: row.client_organization_id,
        layout: row.layout,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

