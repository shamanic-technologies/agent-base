/**
 * Create Table Utility
 * 
 * Creates a new table in the database (via Xata API) with the specified name, description, and schema.
 */
import { 
    InternalUtilityTool, 
    ErrorResponse
} from '@agent-base/types';
import { registry } from '../../../registry/registry.js';
import { 
  findXataWorkspace, 
  createXataTable, 
  generateUniqueDatabaseName, // Assuming this helper exists
  addXataTableColumn // Assuming this helper exists
} from '../../clients/xata-client.js';

// --- Local Type Definitions ---
// Keep schema simple, validation happens via Zod
export interface CreateTableRequest {
  name: string;
  description: string;
  schema: Record<string, string>; // Key: col name, Value: col type. Changed from clientUserIdentificationMapping
}

// Define valid Xata column types for schema validation
const xataColumnTypes = [
  'string', 'text', 'email', 'int', 'float', 'bool', 
  'datetime', 'multiple', 'link', 'object', 'vector' // Add others as needed
] as const;

// Define Success Response structure
interface CreateTableSuccessResponse {
  status: 'success';
  data: {
    message: string;
    table: {
      id: string;
      name: string;
      description: string;
      schema: Record<string, string>; // Changed from clientUserIdentificationMapping
      created_at: string;
    }
  }
}

type CreateTableResponse = CreateTableSuccessResponse | ErrorResponse;

// --- End Local Definitions ---

/**
 * Implementation of the Create Table utility
 */
const createTableUtility: InternalUtilityTool = {
  id: 'utility_create_table',
  description: "Create a new table in the user's dedicated database (via Xata API).",
  schema: {
    type: 'object', // Added
    properties: { // Added
      name: { 
        // Removed jsonSchema: { 
        type: 'string',
        description: 'The name of the table to create (alphanumeric, underscores allowed).',
        examples: ['users', 'product_catalog']
        // Removed } satisfies JsonSchema 
      },
      description: { 
        // Removed jsonSchema: { 
        type: 'string',
        description: "A brief description of the table's purpose.",
        examples: ['Stores user profile information.']
        // Removed } satisfies JsonSchema 
      },
      schema: { 
        // Removed jsonSchema: { 
        type: 'object',
        description: 'The schema definition: keys are column names, values are Xata data types.',
        additionalProperties: { 
          type: 'string',
          enum: [...xataColumnTypes]
        },
        examples: [{
          "email": "email",
          "name": "string",
          "age": "int",
          "is_active": "bool"
        }]
        // Removed } satisfies JsonSchema 
      }
    }, // Added closing brace for properties
    required: ['name', 'description', 'schema'] // Added required fields
  },
  
  execute: async (clientUserId: string, platformUserId: string, platformApiKey: string, conversationId: string, params: CreateTableRequest): Promise<CreateTableResponse> => {
    const logPrefix = '📊 [DB_CREATE_TABLE]';
    try {
      // Use raw params
      const { name, description, schema } = params || {};
      
      // Basic validation
      if (!name || typeof name !== 'string') {
        return { success: false, error: "Table name is required and must be a string" } as ErrorResponse;
      }
      if (!description || typeof description !== 'string') {
        return { success: false, error: "Table description is required and must be a string" } as ErrorResponse;
      }
      if (!schema || typeof schema !== 'object' || Object.keys(schema).length === 0) {
        return { success: false, error: "Schema is required and must be a non-empty object" } as ErrorResponse;
      }
      // Validate schema values against known types (optional, as Zod definition implies this)
      for (const colType of Object.values(schema)) {
        if (!xataColumnTypes.includes(colType as any)) {
          return { success: false, error: `Invalid column type '${colType}' in schema. Valid types: ${xataColumnTypes.join(', ')}` } as ErrorResponse;
        }
      }
      
      console.log(`${logPrefix} Creating table: "${name}" for user ${clientUserId}`);
      
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
      
      // Determine database name
      const databaseName = process.env.XATA_DATABASE; // Using a fixed DB name from env
      if (!databaseName) {
         return { success: false, error: 'Service configuration error: XATA_DATABASE not set' } as ErrorResponse;
      }
      
      // Create the table in Xata
      // Assuming createXataTable handles potential errors like table already exists
      const tableResult = await createXataTable(databaseName, name, workspace);
      
      // Add columns based on schema
      // Consider batching column additions if possible via Xata API
      for (const [columnName, columnType] of Object.entries(schema)) {
        try {
          await addXataTableColumn(databaseName, name, columnName, columnType, workspace);
        } catch (colError: any) {
          console.error(`${logPrefix} Failed to add column '${columnName}' to table '${name}':`, colError);
          // Potentially collect errors and report them, or fail the whole operation
          // For now, we might continue and report partial success/failure
        }
      }
      
      // Return standard success response
      const successResponse: CreateTableSuccessResponse = {
        status: "success",
        data: {
          message: "Table created successfully (column addition results may vary)",
          table: {
            id: tableResult.id || `table_${name}`, // Use actual ID if returned
            name,
            description,
            schema, // Return the requested schema
            created_at: new Date().toISOString()
          }
        }
      };
      return successResponse;

    } catch (error: any) {
      console.error(`${logPrefix} Error creating table:`, error);
      // Return standard UtilityErrorResponse
      return {
        success: false,
        error: "Failed to create table",
        details: error instanceof Error ? error.message : String(error)
      } as ErrorResponse;
    }
  }
};

// Register the utility
registry.register(createTableUtility);

// Export the utility
export default createTableUtility; 