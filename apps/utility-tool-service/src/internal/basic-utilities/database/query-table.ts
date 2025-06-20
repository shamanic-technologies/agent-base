/**
 * Query Table Utility
 * 
 * Executes queries on database tables and returns results.
 * This version uses the Xata SDK and does not parse SQL.
 */
import { 
  InternalUtilityTool, 
  ErrorResponse,
  ServiceResponse,
  ExecuteToolResult
} from '@agent-base/types';
import { registry } from '../../../registry/registry.js';
import { getOrCreateClientForUser } from '@agent-base/xata-client';

// --- Local Type Definitions ---
export interface QueryTableRequest {
  table: string;
  operation: 'select' | 'insert' | 'update' | 'delete';
  payload: Record<string, any>;
}

// --- End Local Definitions ---

/**
 * Implementation of the Query Table utility using the Xata SDK
 */
const queryTableUtility: InternalUtilityTool = {
  id: 'utility_query_table',
  description: 'Perform operations (select, insert, update, delete) on a database table.',
  schema: {
    type: 'object',
    properties: {
      table: { 
        type: 'string',
        description: 'The name of the table to query.',
        minLength: 1,
        examples: ['users', 'orders']
      },
      operation: {
        type: 'string',
        enum: ['select', 'insert', 'update', 'delete'],
        description: 'The database operation to perform.',
        examples: ['select', 'insert']
      },
      payload: {
        type: 'object',
        description: 'The data or query for the operation. Structure depends on the operation.',
        examples: [
          {
            "filter": { "email": "test@example.com" },
            "columns": ["name", "email"],
            "page": { "size": 10 }
          },
          { "name": "New Product", "price": 99.99 },
          { "id": "rec_123", "data": { "price": 109.99 } },
          { "id": "rec_456" }
        ]
      }
    },
    required: ['table', 'operation', 'payload']
  },
  
  execute: async (clientUserId: string, clientOrganizationId: string, platformUserId: string, platformApiKey: string, conversationId: string, params: QueryTableRequest): Promise<ServiceResponse<ExecuteToolResult>> => {
    const logPrefix = '📊 [DB_QUERY_TABLE]';
    try {
      const { table, operation, payload } = params || {};
      
      if (!table || !operation || !payload) {
        return { success: false, error: "Missing required parameters: table, operation, and payload." };
      }
      
      console.log(`${logPrefix} Executing operation "${operation}" on table "${table}"`);
      
      const { client: xata } = await getOrCreateClientForUser(clientUserId, clientOrganizationId);
      const tableClient = xata.db[table];
      
      if (!tableClient) {
        throw new Error(`Table '${table}' not found in the database.`);
      }

      let result: any;

      switch (operation) {
        case 'select':
          // Payload for select can contain filter, columns, page, etc.
          const page = await tableClient.filter(payload.filter || {}).select(payload.columns).getPaginated(payload.page);
          result = page.records;
          break;

        case 'insert':
          // Payload for insert is the record data
          result = await tableClient.create(payload);
          break;

        case 'update':
          // Payload for update requires an ID and the data to update
          if (!payload.id) {
            return { success: false, error: "Update operation requires an 'id' in the payload." };
          }
          result = await tableClient.update(payload.id, payload.data);
          break;

        case 'delete':
          // Payload for delete requires an ID
          if (!payload.id) {
            return { success: false, error: "Delete operation requires an 'id' in the payload." };
          }
          result = await tableClient.delete(payload.id);
          break;

        default:
          return { success: false, error: `Unsupported operation: ${operation}` };
      }

      return { success: true, data: result };

    } catch (error: any) {
      console.error(`${logPrefix} Error executing query:`, error);
      const errorResponse: ErrorResponse = {
        success: false,
        error: "Failed to execute database operation",
        details: error.message || String(error)
      };
      return errorResponse;
    }
  }
};

// Register the utility
registry.register(queryTableUtility);

// Export the utility
export default queryTableUtility; 