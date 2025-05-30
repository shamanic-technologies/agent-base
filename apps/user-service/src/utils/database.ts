/**
 * Database Service Integration
 * 
 * Utilities for communicating with the database service.
 */
import { config } from '../config/env';
import {
  GetOrCreatePlatformUserInput, 
  PlatformUser, 
  ServiceResponse
} from '@agent-base/types';
// Import the api-client functions
import { 
  getOrCreatePlatformUser, 
  getCurrentPlatformUser,
  // getOrCreateClientUser,
  // getCurrentClientUser
} from '@agent-base/api-client';

// const dbServiceUrl = config.databaseServiceUrl; // No longer used, API client handles its own URL config

/**
 * Saves or retrieves a user in the database service based on provider ID.
 * Uses the API client.
 * 
 * @param inputData User information, including providerUserId.
 * @returns Promise resolving to the platform user data
 */
export async function getOrCreatePlatformUserInDatabase(inputData: GetOrCreatePlatformUserInput): Promise<ServiceResponse<PlatformUser>> {
  // Use the API client function
  const response = await getOrCreatePlatformUser(inputData);
  
  if (!response.success) {
    console.error(`[User Service] Failed to save/get user via api-client: ${response.error}`);
  }
  return response;
}

/**
 * Retrieves a user from the database service by their platform ID.
 * Uses the API client.
 * 
 * @param platformUserId The platform user ID (UUID)
 * @returns Promise resolving to the user data or null if not found
 */
export async function getPlatformUserFromDatabase(platformUserId: string): Promise<ServiceResponse<PlatformUser>> {

  // Use the API client function
  // The client function handles passing the platformUserId for the header
  const response = await getCurrentPlatformUser(platformUserId);

  if (!response.success) {
    console.error(`[User Service] Failed to get user ${platformUserId} via api-client: ${response.error}`);
  }
  
  return response;
} 

// /**
//  * Saves or retrieves a user in the database service based on client ID.
//  * Uses the API client.
//  * 
//  * @param inputData User information, including clientUserId.
//  * @returns Promise resolving to the platform user data
//  */
// export async function getOrCreateClientUserInDatabase(inputData: GetOrCreateClientUserInput): Promise<ServiceResponse<ClientUser>> {
//   // Use the API client function
//   const response = await getOrCreateClientUser(inputData);
  
//   if (!response.success) {
//     console.error(`[User Service] Failed to save/get user via api-client: ${response.error}`);
//   }
//   return response;
// }

// /**
//  * Retrieves a user from the database service by their client ID.
//  * Uses the API client.
//  * 
//  * @param clientUserId The client user ID (UUID)
//  * @returns Promise resolving to the user data or null if not found
//  */
// export async function getClientUserFromDatabase(clientUserId: string): Promise<ServiceResponse<ClientUser>> {

//   // Use the API client function
//   // The client function handles passing the clientUserId for the header
//   const response = await getCurrentClientUser(clientUserId);

//   if (!response.success) {
//     console.error(`[User Service] Failed to get user ${clientUserId} via api-client: ${response.error}`);
//   }
  
//   return response;
// } 