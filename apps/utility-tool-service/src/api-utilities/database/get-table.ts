/**
 * Get Table Utility
 * 
 * Returns information about a database table, including schema and optionally data
 */
import { UtilityTool, GetTableRequest } from '../../types/index.js';
import { registry } from '../../registry/registry.js';
import {
  findXataWorkspace,
  getXataClient
} from '../../xata-client.js';

/**
 * Implementation of the Get Table utility
 */
const getTableUtility: UtilityTool = {
  id: 'utility_get_table',
  description: 'Get information about a database table, including schema and optionally data',
  schema: {
    table: {
      type: 'string',
      description: 'The name of the table to retrieve'
    },
    includeData: {
      type: 'boolean',
      optional: true,
      description: 'Whether to include table data in the response (default: true)'
    },
    limit: {
      type: 'number',
      optional: true,
      description: 'Maximum number of data rows to return (default: 10)'
    }
  },
  
  execute: async (userId: string, conversationId: string, params: GetTableRequest): Promise<any> => {
    try {
      // Extract and validate parameters
      const { table, includeData = true, limit = 10 } = params;
      
      if (!table || typeof table !== 'string') {
        throw new Error("Table name is required and must be a string");
      }
      
      console.log(`📊 [DATABASE] Getting table information for: "${table}", user: ${userId}`);
      
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
      
      // Return table information
      return {
        status: "success",
        message: "Table information retrieved successfully",
        table: tableInfo
      };
    } catch (error) {
      console.error("❌ [DATABASE] Error getting table information:", error);
      return {
        status: "error",
        message: "Failed to retrieve table information",
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// Register the utility
registry.register(getTableUtility);

// Export the utility
export default getTableUtility; 