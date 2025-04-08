/**
 * Alter Table Utility
 * 
 * Modifies existing table structures in the database
 */
import { UtilityTool, UtilityErrorResponse } from '../../types/index.js';
import { registry } from '../../registry/registry.js';
import {
  findXataWorkspace,
  getXataClient,
  addXataTableColumn
} from '../../xata-client.js';

// --- Local Type Definitions ---
export interface AlterTableRequest {
  table: string;
  addColumn?: {
    name: string;
    type: string;
  };
  removeColumn?: string;
  renameColumn?: {
    oldName: string;
    newName: string;
  };
}
// --- End Local Definitions ---

/**
 * Implementation of the Alter Table utility
 */
const alterTableUtility: UtilityTool = {
  id: 'utility_alter_table',
  description: 'Modify the structure of existing database tables',
  schema: {
    table: {
      type: 'string',
      description: 'The name of the table to modify'
    },
    addColumn: {
      type: 'object',
      optional: true,
      description: 'Definition of a column to add to the table'
    },
    removeColumn: {
      type: 'string',
      optional: true,
      description: 'Name of a column to remove from the table'
    },
    renameColumn: {
      type: 'object',
      optional: true,
      description: 'Definition for renaming a column in the table'
    }
  },
  
  execute: async (userId: string, conversationId: string, params: AlterTableRequest): Promise<any> => {
    try {
      // Extract and validate parameters
      const { table, addColumn, removeColumn, renameColumn } = params;
      
      if (!table || typeof table !== 'string') {
        throw new Error("Table name is required and must be a string");
      }
      
      // Ensure at least one operation is specified
      if (!addColumn && !removeColumn && !renameColumn) {
        throw new Error("At least one table alteration operation must be specified");
      }
      
      console.log(`📊 [DATABASE] Altering table: "${table}" for user ${userId}`);
      
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
      
      // Use user ID to determine database name or the default database
      const databaseName = process.env.XATA_DATABASE;
      if (!databaseName) {
        throw new Error('XATA_DATABASE is required in environment variables');
      }
      
      // Configure Xata API access
      const region = 'us-east-1'; // Default region
      const branch = 'main'; // Default branch
      const workspaceUrl = `https://${workspace.slug}-${workspace.unique_id}.${region}.xata.sh`;
      
      const alterations = [];
      const xataClient = getXataClient();
      
      // Handle adding a column
      if (addColumn) {
        if (!addColumn.name || !addColumn.type) {
          throw new Error("When adding a column, both name and type must be specified");
        }
        
        console.log(`📊 [DATABASE] Adding column: "${addColumn.name}" (${addColumn.type})`);
        
        await addXataTableColumn(
          databaseName,
          table,
          addColumn.name,
          addColumn.type,
          workspace
        );
        
        alterations.push({
          operation: "add_column",
          column_name: addColumn.name,
          column_type: addColumn.type,
          status: "success"
        });
      }
      
      // Handle removing a column
      if (removeColumn) {
        if (typeof removeColumn !== 'string') {
          throw new Error("Column name to remove must be a string");
        }
        
        console.log(`📊 [DATABASE] Removing column: "${removeColumn}"`);
        
        // Use Xata API to remove the column
        const removeColumnResponse = await fetch(
          `${workspaceUrl}/db/${databaseName}:${branch}/tables/${table}/columns/${removeColumn}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${process.env.XATA_API_KEY}`
            }
          }
        );
        
        if (!removeColumnResponse.ok) {
          throw new Error(`Failed to remove column: ${removeColumnResponse.status} ${removeColumnResponse.statusText}`);
        }
        
        alterations.push({
          operation: "remove_column",
          column_name: removeColumn,
          status: "success"
        });
      }
      
      // Handle renaming a column
      if (renameColumn) {
        if (!renameColumn.oldName || !renameColumn.newName) {
          throw new Error("When renaming a column, both oldName and newName must be specified");
        }
        
        console.log(`📊 [DATABASE] Renaming column: "${renameColumn.oldName}" to "${renameColumn.newName}"`);
        
        // Use Xata API to rename the column
        const renameColumnResponse = await fetch(
          `${workspaceUrl}/db/${databaseName}:${branch}/tables/${table}/columns/${renameColumn.oldName}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.XATA_API_KEY}`
            },
            body: JSON.stringify({
              name: renameColumn.newName
            })
          }
        );
        
        if (!renameColumnResponse.ok) {
          throw new Error(`Failed to rename column: ${renameColumnResponse.status} ${renameColumnResponse.statusText}`);
        }
        
        alterations.push({
          operation: "rename_column",
          old_name: renameColumn.oldName,
          new_name: renameColumn.newName,
          status: "success"
        });
      }
      
      // Get the updated schema after alterations
      const getTableResponse = await fetch(
        `${workspaceUrl}/db/${databaseName}:${branch}/tables/${table}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.XATA_API_KEY}`
          }
        }
      );
      
      if (!getTableResponse.ok) {
        throw new Error(`Failed to get updated table schema: ${getTableResponse.status} ${getTableResponse.statusText}`);
      }
      
      const tableData = await getTableResponse.json();
      const updatedSchema = {};
      
      // Convert Xata schema to our simplified format
      if (tableData.columns) {
        tableData.columns.forEach(column => {
          updatedSchema[column.name] = column.type;
        });
      }
      
      // Return successful response
      return {
        status: "success",
        message: "Table altered successfully",
        table: {
          name: table,
          alterations: alterations,
          updated_schema: updatedSchema,
          updated_at: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error("❌ [DATABASE] Error altering table:", error);
      return {
        status: "error",
        message: "Failed to alter table",
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// Register the utility
registry.register(alterTableUtility);

// Export the utility
export default alterTableUtility; 