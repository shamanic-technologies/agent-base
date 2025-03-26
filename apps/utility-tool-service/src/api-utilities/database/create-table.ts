/**
 * Create Table Utility
 * 
 * Creates a new table in the database with the specified name, description, and schema.
 */
import { BasicUtilityTool, CreateTableRequest } from '../../types/index.js';
import { registry } from '../../registry/registry.js';
import { 
  findXataWorkspace, 
  createXataTable, 
  generateUniqueDatabaseName,
  addXataTableColumn
} from '../../xata-client.js';

/**
 * Implementation of the Create Table utility
 */
const createTableUtility: BasicUtilityTool = {
  id: 'utility_create_table',
  description: 'Create a new table in the user\'s dedicated database',
  schema: {
    name: {
      type: 'string',
      description: 'The name of the table to create'
    },
    description: {
      type: 'string',
      description: 'A description of the table\'s purpose'
    },
    schema: {
      type: 'object',
      description: 'The schema definition for the table as a key-value object where keys are column names and values are data types'
    }
  },
  
  execute: async (userId: string, conversationId: string, params: CreateTableRequest): Promise<any> => {
    try {
      // Extract and validate parameters
      const { name, description, schema } = params;
      
      if (!name || typeof name !== 'string') {
        throw new Error("Table name is required and must be a string");
      }
      
      if (!description || typeof description !== 'string') {
        throw new Error("Table description is required and must be a string");
      }
      
      if (!schema || typeof schema !== 'object' || Object.keys(schema).length === 0) {
        throw new Error("Schema is required and must be a non-empty object");
      }
      
      console.log(`📊 [DATABASE] Creating table: "${name}" for user ${userId}`);
      
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
      
      // Use user ID to determine database name or create a new one
      // For simplicity, we'll use a fixed database name or the user ID
      const databaseName = process.env.XATA_DATABASE || generateUniqueDatabaseName('user');
      
      // Create the table in Xata
      const tableResult = await createXataTable(databaseName, name, workspace);
      
      // Add columns based on schema
      for (const [columnName, columnType] of Object.entries(schema)) {
        await addXataTableColumn(databaseName, name, columnName, columnType, workspace);
      }
      
      return {
        status: "success",
        message: "Table created successfully",
        table: {
          id: tableResult.id || `table_${name}`,
          name,
          description,
          schema,
          created_at: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error("❌ [DATABASE] Error creating table:", error);
      return {
        status: "error",
        message: "Failed to create table",
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// Register the utility
registry.register(createTableUtility);

// Export the utility
export default createTableUtility; 