// /**
//  * Alter Table Utility
//  * 
//  * Modifies existing table structures in the database.
//  */
// import { 
//   InternalUtilityTool, 
//   ErrorResponse,
//   ServiceResponse,
//   ExecuteToolResult
// } from '@agent-base/types';
// import { registry } from '../../../registry/registry.js';
// import { getOrCreateClientForUser } from '@agent-base/xata-client';
// import fetch from 'node-fetch';

// // --- Local Type Definitions ---
// export interface AlterTableRequest {
//   table: string;
//   addColumn?: {
//     name: string;
//     type: string;
//   };
//   removeColumn?: {
//     name: string;
//   };
//   renameColumn?: {
//     oldName: string;
//     newName: string;
//   };
// }

// const xataColumnTypes = [
//   'string', 'text', 'email', 'int', 'float', 'bool', 
//   'datetime', 'multiple', 'link', 'object', 'vector'
// ] as const;

// interface AlterationResult {
//   operation: string;
//   name?: string;
//   status: 'success' | 'failed';
//   details?: string;
// }


// /**
//  * Implementation of the Alter Table utility
//  */
// const alterTableUtility: InternalUtilityTool = {
//   id: 'utility_alter_table',
//   description: 'Modify an existing database table (add, remove, or rename columns).',
//   schema: {
//     type: 'object',
//     properties: {
//       table: { 
//         type: 'string',
//         description: 'The name of the table to modify.',
//         examples: ['users']
//       },
//       addColumn: { 
//         type: 'object',
//         properties: {
//           name: { type: 'string', description: 'Name of the new column.' },
//           type: { type: 'string', description: 'Type of the new column.', enum: [...xataColumnTypes] }
//         },
//         required: ['name', 'type'],
//         description: 'Definition of a column to add.'
//       },
//       removeColumn: { 
//         type: 'object',
//         properties: {
//             name: { type: 'string', description: 'Name of the column to remove.' }
//         },
//         required: ['name'],
//         description: 'Name of a column to remove.'
//       },
//       renameColumn: { 
//         type: 'object',
//         properties: {
//           oldName: { type: 'string', description: 'Current name of the column.' },
//           newName: { type: 'string', description: 'New name for the column.' }
//         },
//         required: ['oldName', 'newName'],
//         description: 'Definition for renaming a column.'
//       }
//     },
//     required: ['table'],
//   },
  
//   execute: async (clientUserId: string, clientOrganizationId: string, platformUserId: string, platformApiKey: string, conversationId: string, params: AlterTableRequest): Promise<ServiceResponse<ExecuteToolResult>> => {
//     const logPrefix = '📊 [DB_ALTER_TABLE]';
//     try {
//       const { table, addColumn, removeColumn, renameColumn } = params || {};
      
//       if (!table || typeof table !== 'string') {
//         return { success: false, error: "Table name is required." };
//       }
//       if (!addColumn && !removeColumn && !renameColumn) {
//         return { success: false, error: "At least one alteration (addColumn, removeColumn, renameColumn) is required." };
//       }
      
//       console.log(`${logPrefix} Altering table: "${table}" for user ${clientUserId}`);
      
//       const { client: xata, databaseURL } = await getOrCreateClientForUser(clientUserId, clientOrganizationId);
//       const dbUrl = new URL(databaseURL);
//       const [database, branch] = dbUrl.pathname.split('/').slice(2);
//       const tableUrl = `${dbUrl.origin}/db/${database}:${branch}/tables/${table}`;
//       const authHeader = {
//         'Authorization': `Bearer ${process.env.XATA_API_KEY}`,
//         'Content-Type': 'application/json'
//       };
      
//       const results: AlterationResult[] = [];

//       // --- Add Column ---
//       if (addColumn) {
//         const { name, type } = addColumn;
//         const response = await fetch(`${tableUrl}/columns`, {
//             method: 'POST',
//             headers: authHeader,
//             body: JSON.stringify({ name, type })
//         });
//         if (response.ok) {
//             results.push({ operation: 'addColumn', name, status: 'success' });
//         } else {
//             results.push({ operation: 'addColumn', name, status: 'failed', details: await response.text() });
//         }
//       }

//       // --- Remove Column ---
//       if (removeColumn) {
//         const { name } = removeColumn;
//         const response = await fetch(`${tableUrl}/columns/${name}`, {
//             method: 'DELETE',
//             headers: authHeader
//         });
//         if (response.ok) {
//             results.push({ operation: 'removeColumn', name, status: 'success' });
//         } else {
//             results.push({ operation: 'removeColumn', name, status: 'failed', details: await response.text() });
//         }
//       }

//       // --- Rename Column ---
//       if (renameColumn) {
//         const { oldName, newName } = renameColumn;
//         const response = await fetch(`${tableUrl}/columns/${oldName}`, {
//             method: 'PATCH',
//             headers: authHeader,
//             body: JSON.stringify({ name: newName })
//         });
//         if (response.ok) {
//             results.push({ operation: 'renameColumn', name: newName, status: 'success' });
//         } else {
//             results.push({ operation: 'renameColumn', name: oldName, status: 'failed', details: await response.text() });
//         }
//       }
      
//       return { success: true, data: { results } };

//     } catch (error: any) {
//       console.error(`${logPrefix} Error altering table:`, error);
//       return {
//         success: false,
//         error: "Failed to alter table",
//         details: error instanceof Error ? error.message : String(error)
//       };
//     }
//   }
// };

// // Register the utility
// registry.register(alterTableUtility);

// // Export the utility
// export default alterTableUtility;