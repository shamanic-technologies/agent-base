/**
 * Query Table Utility
 * 
 * Executes SQL-like queries on database tables and returns results.
 * Supports basic SELECT, INSERT, UPDATE, and DELETE operations.
 */
import { 
  InternalUtilityTool, 
  ErrorResponse
} from '@agent-base/types';
import { registry } from '../../../registry/registry.js';
import {
  findXataWorkspace,
  // getXataClient // Not used here, direct fetch calls are made
} from '../../clients/xata-client.js';
import { parseSQL } from './sql-parser.js'; // Import with .js extension (correct for NodeNext/ESM)

// --- Local Type Definitions ---
// Keep request simple, validation via Zod
export interface QueryTableRequest {
  table: string;
  query: string;
  params?: Record<string, any>;
}

// Define Success Response structures for different query types
interface QuerySelectSuccessResponse {
  status: 'success';
  data: {
    message: string;
    query_type: 'SELECT';
    rows: Record<string, any>[];
    count: number;
  }
}

interface QueryInsertSuccessResponse {
  status: 'success';
  data: {
    message: string;
    query_type: 'INSERT';
    affected_rows: number;
    inserted_id?: string; // Xata returns the ID of the inserted record
  }
}

interface QueryUpdateSuccessResponse {
  status: 'success';
  data: {
    message: string;
    query_type: 'UPDATE';
    affected_rows: number; // Might be 0 or 1 for single record update
  }
}

interface QueryDeleteSuccessResponse {
  status: 'success';
  data: {
    message: string;
    query_type: 'DELETE';
    affected_rows: number; // Might be 0 or 1 for single record delete
  }
}

// Union type for all possible success responses
type QueryTableSuccessResponse = 
  | QuerySelectSuccessResponse 
  | QueryInsertSuccessResponse 
  | QueryUpdateSuccessResponse 
  | QueryDeleteSuccessResponse;

// Type union for the utility's overall response
type QueryTableResponse = QueryTableSuccessResponse | ErrorResponse;

// --- End Local Definitions ---

/**
 * Implementation of the Query Table utility
 */
const queryTableUtility: InternalUtilityTool = {
  id: 'utility_query_table',
  description: 'Execute SQL-like queries (SELECT, INSERT, UPDATE, DELETE) on a specific database table and return results.',
  schema: {
    type: 'object',
    properties: {
      table: { 
        type: 'string',
        description: 'The name of the table to query.',
        minLength: 1,
        examples: ['users', 'orders']
      },
      query: { 
        type: 'string',
        description: 'The SQL-like query (SELECT, INSERT, UPDATE, DELETE). Use :param syntax for parameters.',
        minLength: 1,
        examples: [
          'SELECT id, name WHERE email = :email',
          'INSERT INTO products (name, price) VALUES (:name, :price)',
          'UPDATE users SET name = :newName WHERE id = :userId',
          'DELETE FROM logs WHERE timestamp < :cutoff'
        ]
      },
      params: { 
        type: 'object',
        description: 'Optional key-value pairs for parameters used in the query (e.g., { email: \'test@example.com\' }).',
        additionalProperties: true,
        examples: [{
          "email": "jane.doe@example.com",
          "category": "electronics",
          "userId": "user_123",
          "newName": "Jane Smith"
        }]
      }
    },
    required: ['table', 'query']
  },
  
  execute: async (clientUserId: string, clientOrganizationId: string, platformUserId: string, platformApiKey: string, conversationId: string, params: QueryTableRequest): Promise<QueryTableResponse> => {
    const logPrefix = '📊 [DB_QUERY_TABLE]';
    try {
      // Use raw params - validation primarily via Zod schema on the caller side
      const { table, query, params: queryParams = {} } = params || {};
      
      // Basic validation
      if (!table || typeof table !== 'string') {
        return { success: false, error: "Table name is required and must be a string" } as ErrorResponse;
      }
      
      if (!query || typeof query !== 'string') {
        return { success: false, error: "Query is required and must be a string" } as ErrorResponse;
      }
      
      console.log(`${logPrefix} Executing query on table "${table}": ${query}`);
      if (queryParams) {
        console.log(`${logPrefix} With parameters:`, queryParams);
      }
      
      // Get workspace
      const workspaceSlug = process.env.XATA_WORKSPACE_SLUG;
      if (!workspaceSlug) {
        return { success: false, error: 'Service configuration error: XATA_WORKSPACE_SLUG not set' } as ErrorResponse;
      }
      
      // Find the workspace
      const workspace = await findXataWorkspace(workspaceSlug);
      if (!workspace) {
        return { success: false, error: `Configuration error: Workspace '${workspaceSlug}' not found` } as ErrorResponse;
      }
      
      // Use the database name from environment variables
      const databaseName = process.env.XATA_DATABASE;
      if (!databaseName) {
        return { success: false, error: 'Service configuration error: XATA_DATABASE not set' } as ErrorResponse;
      }
      
      // Configure Xata API access
      const region = 'us-east-1'; // TODO: Make configurable?
      const branch = 'main'; // TODO: Make configurable?
      const workspaceUrl = `https://${workspace.slug}-${workspace.unique_id}.${region}.xata.sh`;
      const authHeader = `Bearer ${process.env.XATA_API_KEY}`;
      
      // Using a hypothetical robust parser
      const parsedQuery = parseSQL(query, queryParams); 
      
      // Check parse result
      if (!parsedQuery.success) {
         return { success: false, error: 'Failed to parse SQL query', details: parsedQuery.error } as ErrorResponse;
      }

      const { type, columns, values, filters, recordId } = parsedQuery; 
      
      // --- Handle SELECT Query --- 
      if (type === 'SELECT') {
        console.log(`${logPrefix} Executing SELECT with filters:`, filters);
        // Execute the query using Xata API
        const xataPayload: Record<string, any> = {};
        if (filters && Object.keys(filters).length > 0) {
          xataPayload.filter = filters;
        }
        if (columns && columns.length > 0 && !columns.includes('*')) {
          xataPayload.columns = columns;
        }
        // TODO: Add support for LIMIT, OFFSET, SORT from parsed query
        
        const queryResponse = await fetch(
          `${workspaceUrl}/db/${databaseName}:${branch}/tables/${table}/query`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': authHeader
            },
            body: JSON.stringify(xataPayload)
          }
        );
        
        if (!queryResponse.ok) {
          const errorText = await queryResponse.text();
          console.error(`${logPrefix} API Error (SELECT): ${queryResponse.status}`, errorText);
          return { success: false, error: 'Failed to execute SELECT query', details: `Status ${queryResponse.status}: ${errorText}` } as ErrorResponse;
        }
        
        const queryResult = await queryResponse.json();
        const rows = queryResult.records || [];
        
        const successResponse: QuerySelectSuccessResponse = {
          status: "success",
          data: {
            message: "SELECT query executed successfully",
            query_type: "SELECT",
            rows: rows,
            count: rows.length
          }
        };
        return successResponse;

      // --- Handle INSERT Query ---
      } else if (type === 'INSERT') {
        if (!values || Object.keys(values).length === 0) {
           return { success: false, error: 'No values provided or parsed for INSERT query.' } as ErrorResponse;
        }
        console.log(`${logPrefix} Executing INSERT with values:`, values);
        
        // Execute the insert using Xata API
        const insertResponse = await fetch(
          `${workspaceUrl}/db/${databaseName}:${branch}/tables/${table}/data`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': authHeader
            },
            body: JSON.stringify(values)
          }
        );
        
        if (!insertResponse.ok) {
          const errorText = await insertResponse.text();
          console.error(`${logPrefix} API Error (INSERT): ${insertResponse.status}`, errorText);
          return { success: false, error: 'Failed to execute INSERT query', details: `Status ${insertResponse.status}: ${errorText}` } as ErrorResponse;
        }
        
        const insertResult = await insertResponse.json();
        
        const successResponse: QueryInsertSuccessResponse = {
          status: "success",
          data: {
            message: "INSERT query executed successfully",
            query_type: "INSERT",
            affected_rows: 1, // Assuming single record insert
            inserted_id: insertResult.id
          }
        };
        return successResponse;

      // --- Handle UPDATE Query (Requires Record ID) ---
      } else if (type === 'UPDATE') {
         if (!recordId) {
            return { success: false, error: 'UPDATE query requires a record ID in the WHERE clause (e.g., WHERE id = :id)' } as ErrorResponse;
         }
         if (!values || Object.keys(values).length === 0) {
            return { success: false, error: 'No values provided for UPDATE query.' } as ErrorResponse;
         }
         console.log(`${logPrefix} Executing UPDATE for record '${recordId}' with values:`, values);

         const updateResponse = await fetch(
           `${workspaceUrl}/db/${databaseName}:${branch}/tables/${table}/data/${recordId}`,
           {
             method: 'PATCH', // Use PATCH for partial updates
             headers: {
               'Content-Type': 'application/json',
               'Authorization': authHeader
             },
             body: JSON.stringify(values)
           }
         );

         if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            console.error(`${logPrefix} API Error (UPDATE): ${updateResponse.status}`, errorText);
            // Handle 404 specifically
            if (updateResponse.status === 404) {
               return { success: false, error: `Record with ID '${recordId}' not found for UPDATE.` } as ErrorResponse;
            }
            return { success: false, error: 'Failed to execute UPDATE query', details: `Status ${updateResponse.status}: ${errorText}` } as ErrorResponse;
         }

         const successResponse: QueryUpdateSuccessResponse = {
           status: "success",
           data: {
             message: "UPDATE query executed successfully",
             query_type: "UPDATE",
             affected_rows: 1 // Assuming single record update
           }
         };
         return successResponse;

      // --- Handle DELETE Query (Requires Record ID) ---
      } else if (type === 'DELETE') {
         if (!recordId) {
            return { success: false, error: 'DELETE query requires a record ID in the WHERE clause (e.g., WHERE id = :id)' } as ErrorResponse;
         }
         console.log(`${logPrefix} Executing DELETE for record '${recordId}'`);

         const deleteResponse = await fetch(
           `${workspaceUrl}/db/${databaseName}:${branch}/tables/${table}/data/${recordId}`,
           {
             method: 'DELETE',
             headers: {
               'Authorization': authHeader
             }
           }
         );

         if (!deleteResponse.ok) {
            const errorText = await deleteResponse.text();
            console.error(`${logPrefix} API Error (DELETE): ${deleteResponse.status}`, errorText);
             // Handle 404 specifically
            if (deleteResponse.status === 404) {
               return { success: false, error: `Record with ID '${recordId}' not found for DELETE.` } as ErrorResponse;
            }
            return { success: false, error: 'Failed to execute DELETE query', details: `Status ${deleteResponse.status}: ${errorText}` } as ErrorResponse;
         }

         const successResponse: QueryDeleteSuccessResponse = {
           status: "success",
           data: {
             message: "DELETE query executed successfully",
             query_type: "DELETE",
             affected_rows: 1 // Assuming single record delete
           }
         };
         return successResponse;

      } else {
        // Should not happen if parser is exhaustive
        return { success: false, error: 'Unsupported or unparsed query type.', details: `Parsed type: ${type}` } as ErrorResponse;
      }

    } catch (error: any) {
      console.error(`${logPrefix} Error executing query:`, error);
      const errorResponse: ErrorResponse = {
        success: false,
        error: "Failed to execute query",
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