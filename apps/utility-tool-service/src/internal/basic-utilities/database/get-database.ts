/**
 * Database Information Utility
 * 
 * Returns information about the dedicated database for the user/organization,
 * including its name and a list of tables.
 */
import { 
  InternalUtilityTool,
  ErrorResponse,
  ServiceResponse,
  ExecuteToolResult
} from '@agent-base/types';
import { registry } from '../../../registry/registry.js';
import { neon } from '@neondatabase/serverless';

interface TableSchema {
    tableName: string;
}

interface GetDatabaseSuccessResponse_Local {
    databaseName: string;
    tables: TableSchema[];
}

/**
 * Implementation of the Get Database utility
 */
const getDatabaseUtility: InternalUtilityTool = {
  id: 'utility_get_database',
  description: "Get information about the user's dedicated database, including a list of its tables.",
  schema: {
    type: 'object',
    properties: {}
  },
  
  execute: async (clientUserId: string, clientOrganizationId: string, platformUserId: string, platformApiKey: string, conversationId: string): Promise<ServiceResponse<ExecuteToolResult>> => {
    const logPrefix = '📊 [DB_GET_DATABASE]';
    try {
      console.log(`${logPrefix} Getting database information for user ${clientUserId}`);
      
      const dbUrl = process.env.NEON_DATABASE_URL;
      if (!dbUrl) {
        throw new Error('NEON_DATABASE_URL is not set in the environment variables.');
      }
      
      console.debug(`${logPrefix} Connecting using NEON_DATABASE_URL.`);
      const sql = neon(dbUrl);

      const tables = await sql`
          SELECT tablename 
          FROM pg_catalog.pg_tables 
          WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema';
      `;
      
      const dbName = new URL(dbUrl).pathname.slice(1);

      const response: GetDatabaseSuccessResponse_Local = {
        databaseName: dbName || 'neondb',
        tables: tables.map((t: any) => ({ tableName: t.tablename })),
      };
      
      console.debug(`${logPrefix} Successfully retrieved tables for database '${response.databaseName}'.`);
      return { success: true, data: response };

    } catch (error: any) {
      console.error(`${logPrefix} Error:`, error);
      const errorResponse: ErrorResponse = {
        success: false,
        error: "Failed to get database information",
        details: error.message || String(error)
      };
      return errorResponse;
    }
  }
};

// Register the utility
registry.register(getDatabaseUtility);

// Export the utility
export default getDatabaseUtility;