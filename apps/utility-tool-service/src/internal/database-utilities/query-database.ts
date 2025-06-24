/**
 * Query Database Utility
 * 
 * Executes a paginated SQL query against the database via the dashboard service.
 */
import { 
    InternalUtilityTool, 
    ErrorResponse,
    ServiceResponse,
    ExecuteToolResult
} from '@agent-base/types';
import { registry } from '../../registry/registry.js';
import { queryDashboardInternalApiClient } from '@agent-base/api-client';

// --- Local Type Definitions ---
export interface QueryDatabaseRequest {
  query: string;
  page?: number;
  limit?: number;
}

/**
 * Implementation of the Query Database utility
 */
const queryDatabaseUtility: InternalUtilityTool = {
  id: 'query_database',
  description: "Executes a SQL query against the user's dedicated database. Results are paginated.",
  schema: {
    type: 'object',
    properties: {
      query: { 
        type: 'string', 
        description: 'The raw SQL query to execute.',
        examples: ["SELECT * FROM users;", "SELECT status, count(*) FROM orders GROUP BY status;"]
      },
      page: {
        type: 'integer',
        description: 'Optional. The page number to retrieve. Defaults to 1.',
        minimum: 1,
      },
      limit: {
        type: 'integer',
        description: 'Optional. The number of results per page. Maximum 100. Defaults to 100.',
        minimum: 1,
        maximum: 100,
      }
    },
    required: ['query']
  },
  
  execute: async (clientUserId: string, clientOrganizationId: string, platformUserId: string, platformApiKey: string, conversationId: string, params: QueryDatabaseRequest): Promise<ServiceResponse<ExecuteToolResult>> => {
    const logPrefix = '📊 [DB_QUERY_DATABASE]';
    try {
      const { query, page = 1, limit = 100 } = params || {};
      
      if (!query) {
        console.error(`${logPrefix} No query provided`);
        return { success: false, error: "A SQL query string is required." };
      }

      if (limit > 100) {
        console.error(`${logPrefix} The 'limit' parameter cannot exceed 100.`);
        return {
          success: false,
          error: "The 'limit' parameter cannot exceed 100."
        };
      }
            
      const credentials = { clientUserId, clientOrganizationId, platformUserId, platformApiKey };
      
      const response : ServiceResponse<any> = await queryDashboardInternalApiClient(
        { query, page, limit },
        credentials
      );

      if (!response.success) {
        console.error(`${logPrefix} Failed to execute query via dashboard service:`, response.error);
        return response;
      }

      return response;

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