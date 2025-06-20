/**
 * Query Database Utility
 * 
 * Executes a raw SQL query against the database.
 */
import { 
    InternalUtilityTool, 
    ErrorResponse,
    ServiceResponse,
    ExecuteToolResult
} from '@agent-base/types';
import { registry } from '../../../registry/registry.js';
import { executeQuery as executeQueryInDb } from '@agent-base/neon-client';

// --- Local Type Definitions ---
export interface QueryDatabaseRequest {
  query: string;
}

/**
 * Implementation of the Query Database utility
 */
const queryDatabaseUtility: InternalUtilityTool = {
  id: 'utility_query_database',
  description: "Executes a raw SQL query against the user's dedicated database. Use with caution.",
  schema: {
    type: 'object',
    properties: {
      query: { 
        type: 'string',
        description: 'The raw SQL query to execute.',
        examples: ["SELECT * FROM users LIMIT 5;", "SELECT count(*) FROM products;"]
      }
    },
    required: ['query']
  },
  
  execute: async (clientUserId: string, clientOrganizationId: string, platformUserId: string, platformApiKey: string, conversationId: string, params: QueryDatabaseRequest): Promise<ServiceResponse<ExecuteToolResult>> => {
    const logPrefix = '📊 [DB_QUERY_DATABASE]';
    try {
      const { query } = params || {};
      
      if (!query) {
        return { success: false, error: "A SQL query string is required." };
      }
            
      const results = await executeQueryInDb(query);

      return { success: true, data: results };

    } catch (error: any) {
      console.error(`${logPrefix} Error executing query:`, error);
      return {
        success: false,
        error: "Failed to execute query",
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// Register the utility
registry.register(queryDatabaseUtility);

// Export the utility
export default queryDatabaseUtility; 