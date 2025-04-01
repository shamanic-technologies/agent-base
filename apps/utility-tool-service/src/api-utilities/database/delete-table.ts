/**
 * Delete Table Utility
 * 
 * Removes a table from the database
 */
import { UtilityTool, DeleteTableRequest } from '../../types/index.js';
import { registry } from '../../registry/registry.js';
import {
  findXataWorkspace
} from '../../xata-client.js';

/**
 * Implementation of the Delete Table utility
 */
const deleteTableUtility: UtilityTool = {
  id: 'utility_delete_table',
  description: 'Delete a table from the user\'s database',
  schema: {
    table: {
      type: 'string',
      description: 'The name of the table to delete'
    },
    confirm: {
      type: 'boolean',
      optional: true,
      description: 'Confirmation that you want to delete the table (default: false)'
    }
  },
  
  execute: async (userId: string, conversationId: string, params: DeleteTableRequest): Promise<any> => {
    try {
      // Extract and validate parameters
      const { table, confirm = false } = params;
      
      if (!table || typeof table !== 'string') {
        throw new Error("Table name is required and must be a string");
      }
      
      // Require explicit confirmation to delete the table
      if (!confirm) {
        return {
          status: "warning",
          message: "Table deletion requires confirmation",
          details: "Please set confirm=true to confirm table deletion"
        };
      }
      
      console.log(`📊 [DATABASE] Deleting table: "${table}" for user ${userId}`);
      
      // Get workspace
      const workspaceSlug = process.env.XATA_WORKSPACE_SLUG;
      if (!workspaceSlug) {
        throw new Error('XATA_WORKSPACE_SLUG is required in environment variables');
      }
      
      // Find the workspace
      const workspace = await findXataWorkspace(workspaceSlug);
      if (!workspace) {
        throw new Error(`Workspace with slug/name "${workspaceSlug}" not found`);
      }
      
      // Use the database name from environment variables
      const databaseName = process.env.XATA_DATABASE;
      if (!databaseName) {
        throw new Error('XATA_DATABASE is required in environment variables');
      }
      
      // Configure Xata API access
      const region = 'us-east-1'; // Default region
      const branch = 'main'; // Default branch
      const workspaceUrl = `https://${workspace.slug}-${workspace.unique_id}.${region}.xata.sh`;
      
      // Delete the table using the Xata API
      const deleteTableResponse = await fetch(
        `${workspaceUrl}/db/${databaseName}:${branch}/tables/${table}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${process.env.XATA_API_KEY}`
          }
        }
      );
      
      if (!deleteTableResponse.ok) {
        throw new Error(`Failed to delete table: ${deleteTableResponse.status} ${deleteTableResponse.statusText}`);
      }
      
      // Return successful deletion response
      return {
        status: "success",
        message: `Table "${table}" deleted successfully`,
        details: {
          table_name: table,
          deleted_at: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error("❌ [DATABASE] Error deleting table:", error);
      return {
        status: "error",
        message: "Failed to delete table",
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// Register the utility
registry.register(deleteTableUtility);

// Export the utility
export default deleteTableUtility; 