/**
 * Delete Table Utility
 * 
 * Removes a table from the database
 */
import { z } from 'zod'; // Import Zod
import { 
  UtilityTool, 
  UtilityErrorResponse,
  UtilityToolSchema // Import if needed
} from '../../types/index.js';
import { registry } from '../../registry/registry.js';
import {
  findXataWorkspace
} from '../../clients/xata-client.js';

// --- Local Type Definitions ---
// Keep schema simple, validation happens via Zod
export interface DeleteTableRequest {
  table: string;
  confirm?: boolean;
}

// Define Success Response structure
interface DeleteTableSuccessResponse {
  status: 'success';
  data: {
    message: string;
    table_name: string;
    deleted_at: string;
  }
}

type DeleteTableResponse = DeleteTableSuccessResponse | UtilityErrorResponse;

// --- End Local Definitions ---

/**
 * Implementation of the Delete Table utility
 */
const deleteTableUtility: UtilityTool = {
  id: 'utility_delete_table',
  description: 'Delete a table from the user\'s database',
  // Update schema to match Record<string, UtilityToolSchema>
  schema: {
    table: { // Parameter name
      zod: z.string()
            .describe('The name of the table to delete.'),
      // Not optional
      examples: ['orders', 'inventory']
    },
    confirm: { // Parameter name
      zod: z.boolean().optional()
            .describe('Confirmation that you want to delete the table (default: false). Required to proceed with deletion.'),
      // Optional
      examples: [true]
    }
  },
  
  execute: async (userId: string, conversationId: string, params: DeleteTableRequest): Promise<DeleteTableResponse> => {
    const logPrefix = '📊 [DB_DELETE_TABLE]';
    try {
      // Use raw params
      const { table, confirm = false } = params || {};
      
      // Basic validation
      if (!table || typeof table !== 'string') {
        return { status: 'error', error: "Table name is required and must be a string" };
      }
      
      // Require explicit confirmation to delete the table
      if (!confirm) {
        // Return a non-error status to indicate confirmation is needed
        return {
          status: "error", // Changed to error as it prevents action
          error: "Table deletion requires confirmation",
          details: "Set the 'confirm' parameter to true to proceed with deletion."
        };
      }
      
      console.log(`${logPrefix} Deleting table: "${table}" for user ${userId}`);
      
      // Get workspace
      const workspaceSlug = process.env.XATA_WORKSPACE_SLUG;
      if (!workspaceSlug) {
        return { status: 'error', error: 'Service configuration error: XATA_WORKSPACE_SLUG not set' };
      }
      
      // Find the workspace
      const workspace = await findXataWorkspace(workspaceSlug);
      if (!workspace) {
        return { status: 'error', error: `Configuration error: Workspace '${workspaceSlug}' not found` };
      }
      
      // Use the database name from environment variables
      const databaseName = process.env.XATA_DATABASE;
      if (!databaseName) {
        return { status: 'error', error: 'Service configuration error: XATA_DATABASE not set' };
      }
      
      // Configure Xata API access
      const region = 'us-east-1'; // Default region - TODO: Make configurable?
      const branch = 'main'; // Default branch - TODO: Make configurable?
      const workspaceUrl = `https://${workspace.slug}-${workspace.unique_id}.${region}.xata.sh`;
      
      // Delete the table using the Xata API
      console.log(`${logPrefix} Sending DELETE request to: ${workspaceUrl}/db/${databaseName}:${branch}/tables/${table}`);
      const deleteTableResponse = await fetch(
        `${workspaceUrl}/db/${databaseName}:${branch}/tables/${table}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${process.env.XATA_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!deleteTableResponse.ok) {
        const errorBody = await deleteTableResponse.text();
        console.error(`${logPrefix} Failed API call: ${deleteTableResponse.status} ${deleteTableResponse.statusText}`, errorBody);
        return { 
          status: 'error', 
          error: `API Error: Failed to delete table '${table}'`, 
          details: `Status: ${deleteTableResponse.status} ${deleteTableResponse.statusText}. Response: ${errorBody}`
        };
      }
      
      // Return standard success response
      const successResponse: DeleteTableSuccessResponse = {
        status: "success",
        data: {
          message: `Table "${table}" deleted successfully`,
          table_name: table,
          deleted_at: new Date().toISOString()
        }
      };
      return successResponse;
    } catch (error: any) {
      console.error(`${logPrefix} Error deleting table:`, error);
      // Return standard UtilityErrorResponse
      return {
        status: "error",
        error: "Failed to delete table",
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// Register the utility
registry.register(deleteTableUtility);

// Export the utility
export default deleteTableUtility; 