// /**
//  * Create Table Utility
//  * 
//  * Creates a new table in the database with the specified name and schema.
//  */
// import { 
//     InternalUtilityTool, 
//     ErrorResponse,
//     ServiceResponse,
//     ExecuteToolResult
// } from '@agent-base/types';
// import { registry } from '../../../registry/registry.js';
// import { getOrCreateClientForUser } from '@agent-base/xata-client';
// import fetch from 'node-fetch';

// // --- Local Type Definitions ---
// export interface CreateTableRequest {
//   name: string;
//   schema: Record<string, string>; // Key: col name, Value: col type.
// }

// const xataColumnTypes = [
//   'string', 'text', 'email', 'int', 'float', 'bool', 
//   'datetime', 'multiple', 'link', 'object', 'vector'
// ] as const;

// interface CreateTableSuccessResponse_Local {
//   message: string;
//   tableName: string;
// }

// /**
//  * Implementation of the Create Table utility
//  */
// const createTableUtility: InternalUtilityTool = {
//   id: 'utility_create_table',
//   description: "Create a new table in the user's dedicated database.",
//   schema: {
//     type: 'object',
//     properties: {
//       name: { 
//         type: 'string',
//         description: 'The name of the table to create (alphanumeric, underscores allowed).',
//         examples: ['users', 'product_catalog']
//       },
//       schema: { 
//         type: 'object',
//         description: 'The schema definition: keys are column names, values are Xata data types.',
//         additionalProperties: { 
//           type: 'string',
//           enum: [...xataColumnTypes]
//         },
//         examples: [{
//           "email": "email",
//           "name": "string",
//           "age": "int",
//         }]
//       }
//     },
//     required: ['name', 'schema']
//   },
  
//   execute: async (clientUserId: string, clientOrganizationId: string, platformUserId: string, platformApiKey: string, conversationId: string, params: CreateTableRequest): Promise<ServiceResponse<ExecuteToolResult>> => {
//     const logPrefix = '📊 [DB_CREATE_TABLE]';
//     try {
//       const { name: tableName, schema } = params || {};
      
//       if (!tableName || typeof tableName !== 'string') {
//         return { success: false, error: "Table name is required and must be a string" };
//       }
//       if (!schema || typeof schema !== 'object' || Object.keys(schema).length === 0) {
//         return { success: false, error: "Schema is required and must be a non-empty object" };
//       }
      
//       console.log(`${logPrefix} Creating table: "${tableName}" for user ${clientUserId}`);
      
//       // Ensure the database exists and get a client instance
//       const { client: xata, databaseURL } = await getOrCreateClientForUser(clientUserId, clientOrganizationId);
//       const dbUrl = new URL(databaseURL);
//       const [database, branch] = dbUrl.pathname.split('/').slice(2);
//       const tableUrl = `${dbUrl.origin}/db/${database}:${branch}/tables/${tableName}`;
//       const authHeader = {
//         'Authorization': `Bearer ${process.env.XATA_API_KEY}`,
//         'Content-Type': 'application/json'
//       };

//       // 1. Create the table
//       const createResponse = await fetch(tableUrl, {
//         method: 'PUT',
//         headers: authHeader,
//       });

//       if (createResponse.status !== 201 && createResponse.status !== 200 && createResponse.status !== 409) {
//           const errorText = await createResponse.text();
//           return { success: false, error: `Failed to create table '${tableName}'`, details: errorText };
//       }

//       // 2. Add columns to the table
//       const columnPayload = {
//           columns: Object.entries(schema).map(([name, type]) => ({ name, type }))
//       };
      
//       const addColumnsResponse = await fetch(`${tableUrl}/schema`, {
//           method: 'PUT',
//           headers: authHeader,
//           body: JSON.stringify(columnPayload)
//       });

//       if (!addColumnsResponse.ok) {
//         const errorText = await addColumnsResponse.text();
//         // If we fail here, the table might exist but be empty. This is complex to handle atomically without transactions.
//         // We will report the error and the user can decide to delete/retry.
//         return { success: false, error: `Failed to add columns to table '${tableName}'`, details: errorText };
//       }

//       const successResponse: CreateTableSuccessResponse_Local = {
//         message: `Table '${tableName}' created successfully.`,
//         tableName: tableName
//       };
      
//       return { success: true, data: successResponse };

//     } catch (error: any) {
//       console.error(`${logPrefix} Error creating table:`, error);
//       return {
//         success: false,
//         error: "Failed to create table",
//         details: error instanceof Error ? error.message : String(error)
//       };
//     }
//   }
// };

// // Register the utility
// registry.register(createTableUtility);

// // Export the utility
// export default createTableUtility; 