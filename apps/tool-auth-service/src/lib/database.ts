// /**
//  * Database Service Client
//  * 
//  * Handles all interactions with the database service
//  */
// import {
//   OAuth, 
//   CreateOrUpdateOAuthInput,
//   ServiceResponse,
//   GetUserOAuthInput,
// } from '@agent-base/types';
// // Import the shared HTTP client utility
// // import { makeServiceRequest } from '@agent-base/types'; // Old import
// import { makeWebAnonymousServiceRequest } from '@agent-base/api-client'; // New import

// const DB_SERVICE_URL = process.env.DATABASE_SERVICE_URL;

// // Re-export the types for convenience
// export type { OAuth, CreateOrUpdateOAuthInput, ServiceResponse, GetUserOAuthInput };

// /**
//  * Create or update user credentials using the shared HTTP client utility.
//  */
// export async function createOrUpdateCredentials(
//   input: CreateOrUpdateOAuthInput
// ): Promise<ServiceResponse<void>> {
//   if (!DB_SERVICE_URL) {
//     console.error('DATABASE_SERVICE_URL is not defined.');
//     return { success: false, error: 'Database service URL not configured.' };
//   }
//   // The correct endpoint is POST /oauth
//   return makeWebAnonymousServiceRequest<void>(
//     DB_SERVICE_URL,
//     'POST',
//     '/oauth', // Corrected path
//     input, // Send input as the request body (data)
//     undefined // No query parameters
//   );
// }

// /**
//  * Get user credentials by user ID using the shared HTTP client utility.
//  */
// export async function getCredentials(
//   input: GetUserOAuthInput
// ): Promise<ServiceResponse<OAuth[]>> {
//   if (!DB_SERVICE_URL) {
//     console.error('DATABASE_SERVICE_URL is not defined.');
//     return { success: false, error: 'Database service URL not configured.' };
//   }

//   // Create a new params object to avoid mutating the original input
//   const params = {
//     ...input,
//     requiredScopes: input.requiredScopes.join(','),
//   };

//   // Use makeWebAnonymousServiceRequest for GET request, sending input as query parameters
//   return makeWebAnonymousServiceRequest<OAuth[]>(
//     DB_SERVICE_URL,
//     'GET',
//     '/oauth',
//     undefined, // No request body (data)
//     params // Send modified params with comma-separated scopes
//   );
// }
