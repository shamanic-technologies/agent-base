/**
 * Get Table Utility
 * 
 * Returns information about a database table, including schema and optionally data
 */
import { z } from 'zod'; // Import Zod
import { 
  UtilityTool, 
  UtilityErrorResponse,
  UtilityToolSchema // Import UtilityToolSchema
} from '../../types/index.js';
import { registry } from '../../registry/registry.js';
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

type GetTableResponse = GetTableSuccessResponse | UtilityErrorResponse;

// --- End Local Definitions ---

/**
 * Implementation of the Get Table utility
 */
const getTableUtility: UtilityTool = {
  id: 'utility_get_table',
  description: 'Get information about a database table, including schema and optionally data.',
  // Update schema to use Zod
  schema: {
    table: { // Parameter name
      zod: z.string().min(1)
            .describe('The name of the table to retrieve.'),
      // Not optional
      examples: ['users', 'products']
    },
    includeData: { // Parameter name
      zod: z.boolean().optional().default(true)
            .describe('Whether to include table data rows in the response (default: true).'),
      // Optional
      examples: [false, true]
    },
    limit: { // Parameter name
      zod: z.number().int().positive().optional().default(10)
            .describe('Maximum number of data rows to return if includeData is true (default: 10, max: 100).')
            .refine(val => val <= 100, { message: "Limit cannot exceed 100" }),
      // Optional
      examples: [5, 50, 100]
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
        return { status: 'error', error: "Table name is required and must be a string" };
      }
      // Limit check (though Zod refine should catch this earlier)
      if (limit > 100) {
         return { status: 'error', error: "Limit cannot exceed 100" };
      }
      
      console.log(`${logPrefix} Getting table info for: \"${table}\", includeData: ${includeData}, limit: ${limit}, user: ${userId}`);
      
      // Get workspace
      const workspaceSlug = process.env.XATA_WORKSPACE_SLUG;
      if (!workspaceSlug) {
        return { status: 'error', error: 'Service configuration error: XATA_WORKSPACE_SLUG not set' };
      }
      
      // Find the workspace (using helper from client)
      const workspace = await findXataWorkspace(workspaceSlug);
      if (!workspace) {
        // findXataWorkspace should throw if needed, but catch null just in case
        return { status: 'error', error: `Configuration error: Workspace \'${workspaceSlug}\' not found` };
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
      const errorResponse: UtilityErrorResponse = {
        status: "error",
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