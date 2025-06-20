/**
 * Database Information Utility
 * 
 * Returns information about the dedicated database for the user/organization,
 * including its name and a list of tables with their schemas.
 */
import { 
  InternalUtilityTool,
  ErrorResponse,
  ServiceResponse,
  ExecuteToolResult
} from '@agent-base/types';
import { registry } from '../../../registry/registry.js';
import { getOrCreateClientForUser } from '@agent-base/xata-client';
import fetch from 'node-fetch';
import { TableInfo } from '@agent-base/xata-client';

// --- Local Type Definitions ---
interface GetDatabaseSuccessResponse_Local {
    databaseName: string;
    tables: TableInfo[];
}

// --- End Local Definitions ---

/**
 * Implementation of the Get Database utility
 */
const getDatabaseUtility: InternalUtilityTool = {
  id: 'utility_get_database',
  description: "Get information about the user's dedicated database, including tables and schemas.",
  schema: {
    type: 'object',
    properties: {}
  },
  
  execute: async (clientUserId: string, clientOrganizationId: string, platformUserId: string, platformApiKey: string, conversationId: string): Promise<ServiceResponse<ExecuteToolResult>> => {
    const logPrefix = '📊 [DB_GET_DATABASE]';
    try {
      console.log(`${logPrefix} Getting database information for user ${clientUserId}`);
      
      const { client: xata, databaseURL } = await getOrCreateClientForUser(clientUserId, clientOrganizationId);
      const dbUrl = new URL(databaseURL);
      const [database, branch] = dbUrl.pathname.split('/').slice(2);
      const tablesUrl = `${dbUrl.origin}/db/${database}:${branch}/tables`;
      
      if (!database) {
        throw new Error("Could not parse database name from URL.");
      }

      const authHeader = {
        'Authorization': `Bearer ${process.env.XATA_API_KEY}`,
      };

      // We need to fetch the list of tables first
      const tablesResponse = await fetch(tablesUrl, { headers: authHeader });
      if (!tablesResponse.ok) {
        throw new Error(`Failed to get tables: ${await tablesResponse.text()}`);
      }
      const { tables } = await tablesResponse.json() as { tables: { name: string }[] };

      // Then, for each table, fetch its schema
      const tableInfoPromises = tables.map(async (table) => {
        const schemaResponse = await fetch(`${tablesUrl}/${table.name}/schema`, { headers: authHeader });
        if (!schemaResponse.ok) {
          console.warn(`Could not fetch schema for table ${table.name}`);
          return null;
        }
        const { columns } = await schemaResponse.json() as { columns: { name: string; type: string }[] };
        const schema = columns.reduce((acc, { name, type }) => {
            acc[name] = type;
            return acc;
        }, {} as Record<string, string>);

        return {
          id: `table_${table.name}`,
          name: table.name,
          schema: schema,
        };
      });

      const resolvedTables = (await Promise.all(tableInfoPromises)).filter(Boolean) as TableInfo[];

      const response: GetDatabaseSuccessResponse_Local = {
        databaseName: database,
        tables: resolvedTables,
      };
      
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