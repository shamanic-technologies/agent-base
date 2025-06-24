/**
 * Create Table Utility
 * 
 * Creates a new table in the database with the specified name and schema.
 */
import { 
    InternalUtilityTool, 
    ErrorResponse,
    ServiceResponse,
    ExecuteToolResult
} from '@agent-base/types';
import { registry } from '../../registry/registry.js';
import { createTable as createTableInDb } from '@agent-base/neon-client';

// --- Local Type Definitions ---
export interface CreateTableRequest {
  name: string;
  schema: Record<string, string>;
}

const supportedTypes = [
  'string', 'text', 'email', 'int', 'float', 'bool', 'datetime'
];

interface CreateTableSuccessResponse_Local {
  message: string;
  tableName: string;
}

/**
 * Implementation of the Create Table utility
 */
const createTableUtility: InternalUtilityTool = {
  id: 'create_table',
  description: "Create a new table in the user's dedicated database.",
  schema: {
    type: 'object',
    properties: {
      name: { 
        type: 'string',
        description: 'The name of the table to create (alphanumeric, underscores allowed).',
        examples: ['users', 'product_catalog']
      },
      schema: { 
        type: 'object',
        description: `The schema definition: keys are column names, values are data types. Supported types: ${supportedTypes.join(', ')}.`,
        additionalProperties: { 
          type: 'string',
          enum: supportedTypes
        },
        examples: [{
          "email": "email",
          "name": "string",
          "age": "int",
        }]
      }
    },
    required: ['name', 'schema']
  },
  
  execute: async (clientUserId: string, clientOrganizationId: string, platformUserId: string, platformApiKey: string, conversationId: string, params: CreateTableRequest): Promise<ServiceResponse<ExecuteToolResult>> => {
    const logPrefix = '📊 [DB_CREATE_TABLE]';
    try {
      const { name: tableName, schema } = params || {};
      
      if (!tableName || !schema) {
        return { success: false, error: "Table name and schema are required." };
      }
            
      await createTableInDb(tableName, schema);

      const successResponse: CreateTableSuccessResponse_Local = {
        message: `Table '${tableName}' created successfully.`,
        tableName: tableName
      };
      
      return { success: true, data: successResponse };

    } catch (error: any) {
      console.error(`${logPrefix} Error creating table:`, error);
      return {
        success: false,
        error: "Failed to create table",
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// Register the utility
registry.register(createTableUtility);

// Export the utility
export default createTableUtility; 