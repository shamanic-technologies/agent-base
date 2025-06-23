import { z } from 'zod';

// Base schemas for a file and a directory entry
const fileSchema = z.object({
  contents: z.string(),
});

const fileWrapperSchema = z.object({
  file: fileSchema,
});

// A FileSystemEntry can be a file or a directory.
// For directories, we define the structure recursively.
const fileSystemEntrySchema: z.ZodType = z.lazy(() =>
  z.union([
    fileWrapperSchema,
    z.object({
      directory: z.record(fileSystemEntrySchema),
    }),
  ])
);

/**
 * The schema for the entire file tree for a WebContainer dashboard.
 * It's a dictionary of FileSystemEntry objects.
 * This is what the AI agent should generate and what we validate against.
 */
export const dashboardFileTreeSchema = z.record(fileSystemEntrySchema);

/**
 * Inferred TypeScript type from the Zod schema for type safety in our code.
 */
export type DashboardFileTree = z.infer<typeof dashboardFileTreeSchema>; 

export interface CreateDashboardRequest {
  name: string;
  webContainerConfig: DashboardFileTree;
}
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

export interface Dashboard extends DashboardInfo {
  webContainerConfig: DashboardFileTree;
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
        webContainerConfig: row.web_container_config,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}