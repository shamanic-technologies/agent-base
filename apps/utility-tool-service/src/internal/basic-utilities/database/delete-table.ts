/**
 * Delete Table Utility
 * 
 * Removes a table from the database
 */
// import { z } from 'zod'; // Import Zod
import { 
  InternalUtilityTool,
  ErrorResponse,
  ServiceResponse,
  ExecuteToolResult
} from '@agent-base/types';
import { registry } from '../../../registry/registry.js';
import { getOrCreateClientForUser } from '@agent-base/xata-client';
import fetch from 'node-fetch';

// --- Local Type Definitions ---
// Keep schema simple, validation happens via Zod
export interface DeleteTableRequest {
  table: string;
  confirm?: boolean;
}

// Define Success Response structure
interface DeleteTableSuccessResponse_Local {
  message: string;
  tableName: string;
}

// type DeleteTableResponse = DeleteTableSuccessResponse | ErrorResponse; // Old type

// --- End Local Definitions ---

/**
 * Implementation of the Delete Table utility
 */
const deleteTableUtility: InternalUtilityTool = {
  id: 'utility_delete_table',
  description: 'Delete a table from the user\'s database',
  schema: {
    type: 'object',
    properties: {
      table: { 
        type: 'string',
        description: 'The name of the table to delete.',
        examples: ['orders', 'inventory']
      },
      confirm: { 
        type: 'boolean',
        description: 'Confirmation that you want to delete the table (default: false). Required to proceed with deletion.',
        examples: [true]
      }
    },
    required: ['table', 'confirm']
  },
  
  execute: async (clientUserId: string, clientOrganizationId: string, platformUserId: string, platformApiKey: string, conversationId: string, params: DeleteTableRequest): Promise<ServiceResponse<ExecuteToolResult>> => {
    const logPrefix = '📊 [DB_DELETE_TABLE]';
    try {
      const { table: tableName, confirm = false } = params || {};
      
      if (!tableName || typeof tableName !== 'string') {
        return { success: false, error: "Table name is required and must be a string" };
      }
      
      if (!confirm) {
        return {
          success: false,
          error: "Table deletion requires confirmation. Set the 'confirm' parameter to true.",
        };
      }
      
      console.log(`${logPrefix} Deleting table: "${tableName}" for user ${clientUserId}`);
      
      const { client: xata, databaseURL } = await getOrCreateClientForUser(clientUserId, clientOrganizationId);
      const dbUrl = new URL(databaseURL);
      const [database, branch] = dbUrl.pathname.split('/').slice(2);
      const tableUrl = `${dbUrl.origin}/db/${database}:${branch}/tables/${tableName}`;
      
      const response = await fetch(tableUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${process.env.XATA_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        return { 
          success: false, 
          error: `API Error: Failed to delete table '${tableName}'`, 
          details: `Status: ${response.status}. Response: ${errorText}`
        };
      }
      
      const successResponse: DeleteTableSuccessResponse_Local = {
          message: `Table "${tableName}" deleted successfully`,
          tableName: tableName,
      };

      return { success: true, data: successResponse };

    } catch (error: any) {
      console.error(`${logPrefix} Error deleting table:`, error);
      return {
        success: false,
        error: "Failed to delete table",
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// Register the utility
registry.register(deleteTableUtility);

// Export the utility
export default deleteTableUtility; 