/**
 * Query Table Utility
 * 
 * Executes SQL-like queries on database tables and returns results
 */
import { UtilityTool, QueryTableRequest } from '../../types/index.js';
import { registry } from '../../registry/registry.js';
import {
  findXataWorkspace,
  getXataClient
} from '../../xata-client.js';

/**
 * Implementation of the Query Table utility
 */
const queryTableUtility: UtilityTool = {
  id: 'utility_query_table',
  description: 'Execute SQL-like queries on database tables and return results',
  schema: {
    table: {
      type: 'string',
      description: 'The name of the table to query'
    },
    query: {
      type: 'string',
      description: 'The SQL-like query to execute (e.g., "SELECT * WHERE category = :category")'
    },
    params: {
      type: 'object',
      optional: true,
      description: 'Optional parameters to bind to the query'
    }
  },
  
  execute: async (userId: string, conversationId: string, params: QueryTableRequest): Promise<any> => {
    try {
      // Extract and validate parameters
      const { table, query, params: queryParams } = params;
      
      if (!table || typeof table !== 'string') {
        throw new Error("Table name is required and must be a string");
      }
      
      if (!query || typeof query !== 'string') {
        throw new Error("Query is required and must be a string");
      }
      
      console.log(`📊 [DATABASE] Executing query on table "${table}": ${query}`);
      if (queryParams) {
        console.log(`📊 [DATABASE] With parameters:`, queryParams);
      }
      
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
      
      // Parse the query to determine what kind of operation to perform
      const lowerQuery = query.toLowerCase().trim();
      const isSelectQuery = lowerQuery.startsWith('select');
      const isInsertQuery = lowerQuery.startsWith('insert');
      const isUpdateQuery = lowerQuery.startsWith('update');
      const isDeleteQuery = lowerQuery.startsWith('delete');
      
      if (isSelectQuery) {
        // For SELECT queries, convert to Xata filter syntax
        let filter: Record<string, any> = {};
        
        // Very basic query parser
        // This is a simplistic implementation - a real one would need a proper SQL parser
        // For now, we only support simple WHERE conditions
        if (lowerQuery.includes('where')) {
          const whereClause = query.split(/where/i)[1].trim();
          
          // Handle simple equality conditions (e.g. "column = value")
          const conditions = whereClause.split('and').map(c => c.trim());
          
          conditions.forEach(condition => {
            // Handle "column = value" format
            if (condition.includes('=')) {
              const [column, value] = condition.split('=').map(part => part.trim());
              
              // Handle parameters like :param
              if (value.startsWith(':') && queryParams) {
                const paramName = value.substring(1);
                if (queryParams[paramName] !== undefined) {
                  filter[column] = queryParams[paramName];
                }
              } else {
                // Try to parse as number or boolean if possible
                let parsedValue: any = value;
                if (value === 'true') parsedValue = true;
                else if (value === 'false') parsedValue = false;
                else if (!isNaN(Number(value))) parsedValue = Number(value);
                else {
                  // Remove quotes if they exist
                  parsedValue = value.replace(/^['"]|['"]$/g, '');
                }
                filter[column] = parsedValue;
              }
            }
          });
        }
        
        // Execute the query using Xata API
        const queryResponse = await fetch(
          `${workspaceUrl}/db/${databaseName}:${branch}/tables/${table}/query`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.XATA_API_KEY}`
            },
            body: JSON.stringify({
              filter: Object.keys(filter).length > 0 ? filter : undefined
            })
          }
        );
        
        if (!queryResponse.ok) {
          throw new Error(`Failed to execute query: ${queryResponse.status} ${queryResponse.statusText}`);
        }
        
        const queryResult = await queryResponse.json();
        const results = queryResult.records || [];
        
        return {
          status: "success",
          message: "Query executed successfully",
          query_type: "SELECT",
          rows: results,
          count: results.length
        };
      } else if (isInsertQuery) {
        // Parse the insert query to get the values
        let values: Record<string, any> = {};
        
        try {
          // Match columns and values from INSERT INTO table (col1, col2) VALUES (val1, val2)
          const columnsMatch = query.match(/\(([^)]+)\)\s+values/i);
          const valuesMatch = query.match(/values\s+\(([^)]+)\)/i);
          
          if (columnsMatch && valuesMatch) {
            const columns = columnsMatch[1].split(',').map(c => c.trim());
            const valuesList = valuesMatch[1].split(',').map(v => v.trim());
            
            if (columns.length === valuesList.length) {
              columns.forEach((column, index) => {
                let value: any = valuesList[index];
                
                // Handle parameters like :param
                if (value.startsWith(':') && queryParams) {
                  const paramName = value.substring(1);
                  if (queryParams[paramName] !== undefined) {
                    value = queryParams[paramName];
                  }
                } else {
                  // Try to parse as number or boolean if possible
                  if (value === 'true') value = true;
                  else if (value === 'false') value = false;
                  else if (!isNaN(Number(value))) value = Number(value);
                  else {
                    // Remove quotes if they exist
                    value = value.replace(/^['"]|['"]$/g, '');
                  }
                }
                
                values[column] = value;
              });
            }
          }
        } catch (parseError) {
          console.error("Error parsing INSERT query:", parseError);
          values = queryParams || {};
        }
        
        // If we couldn't parse the query or there are no values, use queryParams
        if (Object.keys(values).length === 0 && queryParams) {
          values = queryParams;
        }
        
        // Execute the insert using Xata API
        const insertResponse = await fetch(
          `${workspaceUrl}/db/${databaseName}:${branch}/tables/${table}/data`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.XATA_API_KEY}`
            },
            body: JSON.stringify(values)
          }
        );
        
        if (!insertResponse.ok) {
          throw new Error(`Failed to insert data: ${insertResponse.status} ${insertResponse.statusText}`);
        }
        
        const insertResult = await insertResponse.json();
        
        return {
          status: "success",
          message: "Data inserted successfully",
          query_type: "INSERT",
          affected_rows: 1,
          inserted_id: insertResult.id
        };
      } else {
        // For other query types, we need more complex implementations
        // For now, return an error suggesting direct API use
        return {
          status: "error",
          message: "Unsupported query type",
          details: "This utility currently only supports basic SELECT and INSERT queries. For more complex operations, please use the appropriate specialized utilities."
        };
      }
    } catch (error) {
      console.error("❌ [DATABASE] Error executing query:", error);
      return {
        status: "error",
        message: "Failed to execute query",
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// Register the utility
registry.register(queryTableUtility);

// Export the utility
export default queryTableUtility; 