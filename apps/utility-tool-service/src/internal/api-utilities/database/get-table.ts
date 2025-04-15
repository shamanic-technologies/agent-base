/**
 * Get Table Utility
 * 
 * Returns information about a database table, including schema and optionally data
 */
// import { z } from 'zod'; // Remove Zod import
import { 
  InternalUtilityTool, 
  ErrorResponse,
  JsonSchema
} from '@agent-base/types';
import { registry } from '../../../registry/registry.js';
import { 
  findXataWorkspace,
  // getXataClient // Not used here, direct fetch calls are made
} from '../../clients/xata-client.js'; // Corrected import path

// --- Local Type Definitions ---
// Keep request simple, validation via Zod
export interface GetTableRequest {
  table: string;
  includeData?: boolean;
  limit?: number;
}

// Define Success Response structure
interface GetTableSuccessResponse {
  status: 'success';
  data: {
    message: string;
    table: {
      id: string;
      name: string;
      description?: string;
      schema: Record<string, string>; // Column name -> Xata type
      data?: Record<string, any>[] | null; // Array of records or null
    }
  }
}

type GetTableResponse = GetTableSuccessResponse | ErrorResponse;

// --- End Local Definitions ---

/**
 * Implementation of the Get Table utility
 */
const getTableUtility: InternalUtilityTool = {
  id: 'utility_get_table',
  description: 'Get information about a database table, including schema and optionally data.',
  schema: {
    table: { 
      jsonSchema: {
        type: 'string',
        description: 'The name of the table to retrieve.',
        minLength: 1, // Zod .min(1)
        examples: ['users', 'products'] // Move examples inside
      } satisfies JsonSchema,
    },
    includeData: { 
      jsonSchema: {
        type: 'boolean',
        description: 'Whether to include table data rows in the response (default: true).',
        default: true, // JSON Schema default
        examples: [false, true] // Move examples inside
      } satisfies JsonSchema,
    },
    limit: { 
      jsonSchema: {
        type: 'integer', // Zod .number().int()
        description: 'Maximum number of data rows to return if includeData is true (default: 10, max: 100).',
        default: 10, // JSON Schema default
        minimum: 1, // Zod .positive() implies minimum 1
        maximum: 100, // Zod .refine() check
        examples: [5, 50, 100] // Move examples inside
      } satisfies JsonSchema,
    }
  },
  
  execute: async (userId: string, conversationId: string, params: GetTableRequest): Promise<GetTableResponse> => {
    const logPrefix = '📊 [DB_GET_TABLE]';
    try {
      // Use raw params - validation primarily via Zod schema on the caller side
      // Still good to have basic checks here
      const { table, includeData = true, limit = 10 } = params || {}; 
      
      // Basic validation
      if (!table || typeof table !== 'string') {
        return { success: false, error: "Table name is required and must be a string" } as ErrorResponse;
      }
      // Limit check (though Zod refine should catch this earlier)
      if (limit > 100) {
         return { success: false, error: "Limit cannot exceed 100" } as ErrorResponse;
      }
      
      console.log(`${logPrefix} Getting table info for: \"${table}\", includeData: ${includeData}, limit: ${limit}, user: ${userId}`);
      
      // Get workspace
      const workspaceSlug = process.env.XATA_WORKSPACE_SLUG;
      if (!workspaceSlug) {
        return { success: false, error: 'Service configuration error: XATA_WORKSPACE_SLUG not set' } as ErrorResponse;
      }
      
      // Find the workspace (using helper from client)
      const workspace = await findXataWorkspace(workspaceSlug);
      if (!workspace) {
        // findXataWorkspace should throw if needed, but catch null just in case
        return { success: false, error: `Configuration error: Workspace \'${workspaceSlug}\' not found` } as ErrorResponse;
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
      
      // Get the table schema using the Xata API
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
        throw new Error(`Failed to get table schema: ${getTableResponse.status} ${getTableResponse.statusText}`);
      }
      
      const tableData = await getTableResponse.json();
      const schema = {};
      
      // Convert Xata schema to our simplified format
      if (tableData.columns) {
        tableData.columns.forEach(column => {
          schema[column.name] = column.type;
        });
      }
      
      // Get table data if requested
      let data = null;
      if (includeData) {
        // Query the table data using the Xata API
        const getDataResponse = await fetch(
          `${workspaceUrl}/db/${databaseName}:${branch}/tables/${table}/query`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.XATA_API_KEY}`
            },
            body: JSON.stringify({
              page: { size: limit }
            })
          }
        );
        
        if (!getDataResponse.ok) {
          throw new Error(`Failed to get table data: ${getDataResponse.status} ${getDataResponse.statusText}`);
        }
        
        const dataResult = await getDataResponse.json();
        data = dataResult.records || [];
      }
      
      // Construct the table information
      const tableInfo = {
        id: tableData.id || `table_${table}`,
        name: table,
        description: tableData.description || `Table containing ${table} data`,
        schema,
        data: data
      };
      
      // Return standard success response
      const successResponse: GetTableSuccessResponse = {
        status: "success",
        data: {
          message: "Table information retrieved successfully",
          table: tableInfo
        }
      };
      return successResponse;

    } catch (error: any) {
      console.error(`${logPrefix} Error getting table information:`, error);
      // Return standard UtilityErrorResponse
      const errorResponse: ErrorResponse = {
        success: false,
        error: "Failed to retrieve table information", // Use 'error' key
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