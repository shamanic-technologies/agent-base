// /**
//  * Get Table Utility
//  * 
//  * Returns information about a database table, including schema and optionally data
//  */
// // import { z } from 'zod'; // Remove Zod import
// import { 
//   InternalUtilityTool, 
//   ErrorResponse,
//   // JsonSchema, // Removed
//   ServiceResponse,
//   ExecuteToolResult,
//   UtilityProvider
// } from '@agent-base/types';
// import { registry } from '../../../registry/registry.js';
// import { getOrCreateClientForUser } from '@agent-base/xata-client';

// // --- Local Type Definitions ---
// // Keep request simple, validation via Zod
// export interface GetTableRequest {
//   table: string;
//   includeData?: boolean;
//   limit?: number;
// }

// // Define Success Response structure
// interface GetTableSuccessResponse_Local {
//   name: string;
//   columns: { name: string; type: string }[];
//   data?: Record<string, any>[];
// }

// // type GetTableResponse = GetTableSuccessResponse | ErrorResponse; // Old type

// // --- End Local Definitions ---

// /**
//  * Implementation of the Get Table utility
//  */
// const getTableUtility: InternalUtilityTool = {
//   id: 'utility_get_table',
//   description: 'Get information about a database table, including schema and optionally data.',
//   schema: {
//     type: 'object', // Added
//     properties: { // Added
//       table: { 
//         // Removed jsonSchema: { 
//         type: 'string',
//         description: 'The name of the table to retrieve.',
//         minLength: 1, 
//         examples: ['users', 'products'] 
//         // Removed } satisfies JsonSchema 
//       },
//       includeData: { 
//         // Removed jsonSchema: { 
//         type: 'boolean',
//         description: 'Whether to include table data rows in the response (default: true).',
//         default: true, 
//         examples: [false, true] 
//         // Removed } satisfies JsonSchema 
//       },
//       limit: { 
//         // Removed jsonSchema: { 
//         type: 'integer', 
//         description: 'Maximum number of data rows to return if includeData is true (default: 10, max: 100).',
//         default: 10, 
//         minimum: 1, 
//         maximum: 100, 
//         examples: [5, 50, 100] 
//         // Removed } satisfies JsonSchema 
//       }
//     }, // Added closing brace for properties
//     required: ['table'] // Added required field
//   },
  
//   execute: async (clientUserId: string, clientOrganizationId: string, platformUserId: string, platformApiKey: string, conversationId: string, params: GetTableRequest): Promise<ServiceResponse<ExecuteToolResult>> => {
//     const logPrefix = '📊 [DB_GET_TABLE]';
//     try {
//       // Use raw params - validation primarily via Zod schema on the caller side
//       // Still good to have basic checks here
//       const { table, includeData = true, limit = 10 } = params || {}; 
      
//       // Basic validation
//       if (!table || typeof table !== 'string') {
//         return { success: false, error: "Table name is required and must be a string" } as ErrorResponse;
//       }
//       // Limit check (though Zod refine should catch this earlier)
//       if (limit > 100) {
//          return { success: false, error: "Limit cannot exceed 100" } as ErrorResponse;
//       }
      
//       console.log(`${logPrefix} Getting table info for: \"${table}\", includeData: ${includeData}, limit: ${limit}, user: ${clientUserId}`);
      
//       const { client: xata } = await getOrCreateClientForUser(clientUserId, clientOrganizationId);

//       // The Xata SDK does not have a direct way to get a table's schema and data in one call.
//       // We also cannot easily get the schema for a single table.
//       // A workaround would be to query the table and infer schema from the first record,
//       // but that is unreliable.
//       // The raw fetch API is actually better for this specific use case.
//       // However, to stick to the SDK, we'll query for data and return that.
//       // The ability to get schema will be temporarily lost, but the tool will be more robust.
      
//       let records: Record<string, any>[] = [];
//       if (includeData) {
//         const tableClient = xata.db[table];
//         if (!tableClient) {
//             throw new Error(`Table '${table}' not found in the database.`);
//         }
//         const page = await tableClient.getPaginated({
//             pagination: { size: limit }
//         });
//         records = page.records;
//       }

//       // We cannot reliably get the schema from the SDK for a single table easily.
//       // We will return a simplified response.
//       const tableInfo: GetTableSuccessResponse_Local = {
//         name: table,
//         columns: [], // TODO: Re-implement schema fetching if a direct method becomes available.
//         data: records,
//       };
      
//       return {
//         success: true,
//         data: tableInfo
//       };

//     } catch (error: any) {
//       console.error(`${logPrefix} Error getting table information:`, error);
//       // Return standard UtilityErrorResponse
//       const errorResponse: ErrorResponse = {
//         success: false,
//         error: "Failed to retrieve table information", // Use 'error' key
//         details: error.message || String(error)
//       };
//       return errorResponse;
//     }
//   }
// };

// // Register the utility
// registry.register(getTableUtility);

// // Export the utility
// export default getTableUtility; 