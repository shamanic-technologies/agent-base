/**
 * Delete Table Utility
 * 
 * Removes a table from the database
 */
// import { z } from 'zod'; // Import Zod
import { 
  InternalUtilityTool,
  ErrorResponse
} from '@agent-base/types';
import { registry } from '../../../registry/registry.js';
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

type DeleteTableResponse = DeleteTableSuccessResponse | ErrorResponse;

// --- End Local Definitions ---

/**
 * Implementation of the Delete Table utility
 */
const deleteTableUtility: InternalUtilityTool = {
  id: 'utility_delete_table',
  description: 'Delete a table from the user\'s database',
  schema: {
    type: 'object',
    properties: {
      table: { 
        type: 'string',
        description: 'The name of the table to delete.',
        examples: ['orders', 'inventory']
      },
      confirm: { 
        type: 'boolean',
        description: 'Confirmation that you want to delete the table (default: false). Required to proceed with deletion.',
        examples: [true]
      }
    },
    required: ['table', 'confirm']
  },
  
  execute: async (clientUserId: string, platformUserId: string, platformApiKey: string, conversationId: string, params: DeleteTableRequest): Promise<DeleteTableResponse> => {
    const logPrefix = '📊 [DB_DELETE_TABLE]';
    try {
      // Use raw params
      const { table, confirm = false } = params || {};
      
      // Basic validation
      if (!table || typeof table !== 'string') {
        return { success: false, error: "Table name is required and must be a string" } as ErrorResponse;
      }
      
      // Require explicit confirmation to delete the table
      if (!confirm) {
        // Return a non-error status to indicate confirmation is needed
        return {
          success: false, // Changed to error as it prevents action
          error: "Table deletion requires confirmation",
          details: "Set the 'confirm' parameter to true to proceed with deletion."
        } as ErrorResponse;
      }
      
      console.log(`${logPrefix} Deleting table: "${table}" for user ${clientUserId}`);
      
      // Get workspace
      const workspaceSlug = process.env.XATA_WORKSPACE_SLUG;
      if (!workspaceSlug) {
        return { success: false, error: 'Service configuration error: XATA_WORKSPACE_SLUG not set' } as ErrorResponse;
      }
      
      // Find the workspace
      const workspace = await findXataWorkspace(workspaceSlug);
      if (!workspace) {
        return { success: false, error: `Configuration error: Workspace '${workspaceSlug}' not found` } as ErrorResponse;
      }
      
      // Use the database name from environment variables
      const databaseName = process.env.XATA_DATABASE;
      if (!databaseName) {
        return { success: false, error: 'Service configuration error: XATA_DATABASE not set' } as ErrorResponse;
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
          success: false, 
          error: `API Error: Failed to delete table '${table}'`, 
          details: `Status: ${deleteTableResponse.status} ${deleteTableResponse.statusText}. Response: ${errorBody}`
        } as ErrorResponse;
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
        success: false,
        error: "Failed to delete table",
        details: error instanceof Error ? error.message : String(error)
      } as ErrorResponse;
    }
  }
};

// Register the utility
registry.register(deleteTableUtility);

// Export the utility
export default deleteTableUtility; 