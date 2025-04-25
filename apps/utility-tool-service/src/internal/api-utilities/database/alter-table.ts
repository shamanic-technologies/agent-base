/**
 * Alter Table Utility
 * 
 * Modifies existing table structures in the database (via Xata API).
 */
import { 
  InternalUtilityTool, 
  ErrorResponse,
  JsonSchema
} from '@agent-base/types';
import { registry } from '../../../registry/registry.js';
import {
  findXataWorkspace,
  getXataClient,
  addXataTableColumn // Assuming this helper exists and works
} from '../../clients/xata-client.js';

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

// Define valid Xata column types for addColumn validation
const xataColumnTypes = [
  'string', 'text', 'email', 'int', 'float', 'bool', 
  'datetime', 'multiple', 'link', 'object', 'vector' // Add others as needed
] as const;

// Define Success Response structure
interface AlterTableSuccessResponse {
  status: 'success';
  data: {
    message: string;
    table: {
      name: string;
      alterations: { 
        operation: string; 
        column_name?: string; 
        column_type?: string; 
        old_name?: string; 
        new_name?: string; 
        status: string; 
      }[];
      updated_schema: clientUserIdentificationMapping<string, string>;
      updated_at: string;
    }
  }
}

type AlterTableResponse = AlterTableSuccessResponse | ErrorResponse;

// --- End Local Definitions ---

/**
 * Implementation of the Alter Table utility
 */
const alterTableUtility: InternalUtilityTool = {
  id: 'utility_alter_table',
  description: 'Modify the structure of existing database tables (add, remove, rename columns).',
  schema: {
    table: { 
      jsonSchema: {
        type: 'string',
        description: 'The name of the table to modify.',
        examples: ['users', 'products']
      } satisfies JsonSchema,
    },
    addColumn: { 
      jsonSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Name of the new column.' },
          type: { type: 'string', description: 'Type of the new column.', enum: xataColumnTypes }
        },
        required: ['name', 'type'],
        description: 'Definition of a column to add to the table.',
        examples: [{ name: 'description', type: 'text' }, { name: 'isAdmin', type: 'bool' }]
      } satisfies JsonSchema,
    },
    removeColumn: { 
      jsonSchema: {
        type: 'string',
        description: 'Name of a column to remove from the table.',
        examples: ['old_status']
      } satisfies JsonSchema,
    },
    renameColumn: { 
      jsonSchema: {
        type: 'object',
        properties: {
          oldName: { type: 'string', description: 'Current name of the column.' },
          newName: { type: 'string', description: 'New name for the column.' }
        },
        required: ['oldName', 'newName'],
        description: 'Definition for renaming a column in the table.',
        examples: [{ oldName: 'status', newName: 'current_status' }]
      } satisfies JsonSchema,
    }
  },
  
  execute: async (clientUserId: string, platformUserId: string, platformApiKey: string, conversationId: string, params: AlterTableRequest): Promise<AlterTableResponse> => {
    const logPrefix = '📊 [DB_ALTER_TABLE]';
    try {
      // Use raw params
      const { table, addColumn, removeColumn, renameColumn } = params || {};
      
      // Basic validation
      if (!table || typeof table !== 'string') {
        return { success: false, error: "Table name is required and must be a string" } as ErrorResponse;
      }
      if (!addColumn && !removeColumn && !renameColumn) {
        return { success: false, error: "At least one table alteration operation must be specified (addColumn, removeColumn, or renameColumn)" } as ErrorResponse;
      }
      // Further validation for specific operations if needed (e.g., addColumn requires name/type)
      if (addColumn && (!addColumn.name || !addColumn.type)) {
        return { success: false, error: "When adding a column, both name and type must be specified" } as ErrorResponse;
      }
      if (renameColumn && (!renameColumn.oldName || !renameColumn.newName)) {
         return { success: false, error: "When renaming a column, both oldName and newName must be specified" } as ErrorResponse;
      }
      if (removeColumn && typeof removeColumn !== 'string') {
         return { success: false, error: "Column name to remove must be a string" } as ErrorResponse;
      }
      
      console.log(`${logPrefix} Altering table: "${table}" for user ${clientUserId}`);
      
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
      
      // Use user ID to determine database name or the default database
      const databaseName = process.env.XATA_DATABASE; // TODO: Potentially make this user-specific if needed
      if (!databaseName) {
         return { success: false, error: 'Service configuration error: XATA_DATABASE not set' } as ErrorResponse;
      }
      
      // Configure Xata API access
      const region = process.env.XATA_REGION || 'us-east-1'; // Use env var or default
      const branch = process.env.XATA_BRANCH || 'main'; // Use env var or default
      const xataApiKey = process.env.XATA_API_KEY;
      if (!xataApiKey) {
         return { success: false, error: 'Service configuration error: XATA_API_KEY not set' } as ErrorResponse;
      }

      const workspaceUrl = `https://${workspace.slug}-${workspace.unique_id}.${region}.xata.sh`;
      const baseApiUrl = `${workspaceUrl}/db/${databaseName}:${branch}/tables/${table}`; // Base URL for table operations
      
      const alterations: AlterTableSuccessResponse['data']['table']['alterations'] = [];
      const xataClient = getXataClient(); // Assuming this gets a pre-configured client or uses API key
      
      // Handle adding a column
      if (addColumn) {
        console.log(`${logPrefix} Adding column: "${addColumn.name}" (${addColumn.type})`);
        try {
          await addXataTableColumn(
            databaseName, 
            table,
            addColumn.name,
            addColumn.type,
            workspace // Pass necessary context
          );
          alterations.push({
            operation: "add_column",
            column_name: addColumn.name,
            column_type: addColumn.type,
            status: "success"
          });
        } catch (addError: any) {
            console.error(`${logPrefix} Failed to add column '${addColumn.name}':`, addError);
            alterations.push({ operation: "add_column", column_name: addColumn.name, status: `failed: ${addError.message}` });
            // Decide whether to continue or fail fast - for now, we record failure and continue
        }
      }
      
      // Handle removing a column
      if (removeColumn) {
        console.log(`${logPrefix} Removing column: "${removeColumn}"`);
        const removeColumnResponse = await fetch(
          `${baseApiUrl}/columns/${removeColumn}`,
          {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${xataApiKey}` }
          }
        );
        if (!removeColumnResponse.ok) {
            const errorText = await removeColumnResponse.text();
            console.error(`${logPrefix} Failed to remove column '${removeColumn}': ${removeColumnResponse.status} ${errorText}`);
            alterations.push({ operation: "remove_column", column_name: removeColumn, status: `failed: ${removeColumnResponse.status} ${errorText}` });
        } else {
            alterations.push({ operation: "remove_column", column_name: removeColumn, status: "success" });
        }
      }
      
      // Handle renaming a column
      if (renameColumn) {
        console.log(`${logPrefix} Renaming column: "${renameColumn.oldName}" to "${renameColumn.newName}"`);
        const renameColumnResponse = await fetch(
          `${baseApiUrl}/columns/${renameColumn.oldName}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${xataApiKey}` },
            body: JSON.stringify({ name: renameColumn.newName })
          }
        );
        if (!renameColumnResponse.ok) {
            const errorText = await renameColumnResponse.text();
            console.error(`${logPrefix} Failed to rename column '${renameColumn.oldName}': ${renameColumnResponse.status} ${errorText}`);
            alterations.push({ operation: "rename_column", old_name: renameColumn.oldName, new_name: renameColumn.newName, status: `failed: ${renameColumnResponse.status} ${errorText}` });
        } else {
            alterations.push({ operation: "rename_column", old_name: renameColumn.oldName, new_name: renameColumn.newName, status: "success" });
        }
      }
      
      // Get the updated schema after alterations
      const getTableResponse = await fetch(
        `${baseApiUrl}/schema`,
        {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${xataApiKey}` }
        }
      );
      
      let updatedSchema: clientUserIdentificationMapping<string, string> = {};
      if (getTableResponse.ok) {
        const tableSchemaData = await getTableResponse.json();
        if (tableSchemaData.columns) {
          tableSchemaData.columns.forEach((column: {name: string, type: string}) => {
            updatedSchema[column.name] = column.type;
          });
        }
      } else {
        console.error(`${logPrefix} Failed to get updated table schema: ${getTableResponse.status} ${await getTableResponse.text()}`);
        // Proceed without updated schema if fetch fails
      }
      
      // Return successful response
      const successResponse: AlterTableSuccessResponse = {
        status: "success",
        data: {
          message: "Table alteration process completed.",
          table: {
            name: table,
            alterations: alterations,
            updated_schema: updatedSchema,
            updated_at: new Date().toISOString()
          }
        }
      };
      return successResponse;

    } catch (error: any) {
      console.error(`${logPrefix} Error altering table:`, error);
      // Return standard UtilityErrorResponse
      return {
        success: false,
        error: "Failed to alter table",
        details: error instanceof Error ? error.message : String(error)
      } as ErrorResponse;
    }
  }
};

// Register the utility
registry.register(alterTableUtility);

// Export the utility
export default alterTableUtility; 