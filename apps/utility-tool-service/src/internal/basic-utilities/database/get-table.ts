/**
 * Get Table Utility
 * 
 * Returns information about a database table, including schema and optionally data
 */
import { 
  InternalUtilityTool, 
  ErrorResponse,
  ServiceResponse,
  ExecuteToolResult
} from '@agent-base/types';
import { registry } from '../../../registry/registry.js';
import { getTable as getTableFromDb } from '@agent-base/neon-client';

// --- Local Type Definitions ---
export interface GetTableRequest {
  table: string;
  limit?: number;
}

// Define Success Response structure
interface GetTableSuccessResponse_Local {
  name: string;
  columns: { name:string; type: string }[];
  rows: Record<string, any>[];
}

/**
 * Implementation of the Get Table utility
 */
const getTableUtility: InternalUtilityTool = {
  id: 'utility_get_table',
  description: 'Get information about a database table, including schema and a limited number of rows.',
  schema: {
    type: 'object',
    properties: {
      table: { 
        type: 'string',
        description: 'The name of the table to retrieve.',
        examples: ['users', 'products'] 
      },
      limit: { 
        type: 'integer', 
        description: 'Maximum number of data rows to return (default: 10, max: 100).',
        default: 10, 
        minimum: 1, 
        maximum: 100, 
        examples: [5, 50, 100] 
      }
    },
    required: ['table']
  },
  
  execute: async (clientUserId: string, clientOrganizationId: string, platformUserId: string, platformApiKey: string, conversationId: string, params: GetTableRequest): Promise<ServiceResponse<ExecuteToolResult>> => {
    const logPrefix = '📊 [DB_GET_TABLE]';
    try {
      const { table, limit = 10 } = params || {}; 
      
      if (!table) {
        return { success: false, error: "Table name is required." };
      }
      if (limit > 100) {
         return { success: false, error: "Limit cannot exceed 100." };
      }
            
      const { columns, rows } = await getTableFromDb(table, limit);

      const tableInfo: GetTableSuccessResponse_Local = {
        name: table,
        columns: columns,
        rows: rows,
      };
      
      return { success: true, data: tableInfo };

    } catch (error: any) {
      console.error(`${logPrefix} Error getting table information:`, error);
      const errorResponse: ErrorResponse = {
        success: false,
        error: "Failed to retrieve table information",
        details: error.message || String(error)
      };
      return errorResponse;
    }
  }
};

// Register the utility
registry.register(getTableUtility);

// Export the utility
export default getTableUtility; 