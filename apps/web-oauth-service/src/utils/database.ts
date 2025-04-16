/**
 * Database Service Integration
 * 
 * Utilities for communicating with the database service.
 */
import { config } from '../config/env';
import {
  GetOrCreatePlatformUserInput, 
  PlatformUser, 
  ServiceResponse, 
  ProviderUser
  // Remove makeServiceRequest import if no longer needed here
  // makeServiceRequest 
} from '@agent-base/types';
// Import the api-client functions
import { 
  getOrCreatePlatformUser, 
  getCurrentPlatformUser 
} from '@agent-base/api-client';

const dbServiceUrl = config.databaseServiceUrl; // Keep for reference, though client uses its own URL config

/**
 * Saves or retrieves a user in the database service based on provider ID.
 * Uses the API client.
 * 
 * @param user User information from the OAuth provider
 * @returns Promise resolving to the platform user data
 */
export async function getOrCreateUserInDatabase(user: ProviderUser): Promise<ServiceResponse<PlatformUser>> {
  console.log(`[Auth Service] Calling api-client: getOrCreatePlatformUser for provider ID ${user.id}`);
  
  // Use correct camelCase properties for the input type
  const inputData: GetOrCreatePlatformUserInput = {
    providerUserId: user.id,
    email: user.email,
    displayName: user.name,
    profileImage: user.picture
  };
  
  // Use the API client function
  // Pass a placeholder ID since this action might happen before a platformUserId is established
  const placeholderUserId = ''; // Or determine if a real ID is available/needed
  const response = await getOrCreatePlatformUser(inputData, placeholderUserId);
  
  if (!response.success) {
    console.error(`[Auth Service] Failed to save/get user via api-client: ${response.error}`);
  } else {
    console.log(`[Auth Service] Successfully saved/retrieved user via api-client.`);
  }
  
  return response;
}

/**
 * Retrieves a user from the database service by their platform ID.
 * Uses the API client.
 * 
 * @param userId The platform user ID (UUID)
 * @returns Promise resolving to the user data or null if not found
 */
export async function getUserFromDatabase(userId: string): Promise<ServiceResponse<PlatformUser>> {
  console.log(`[Auth Service] Calling api-client: getCurrentPlatformUser by platform ID ${userId}`);

  // Use the API client function
  // The client function handles passing the userId for the header
  const response = await getCurrentPlatformUser(userId);

  if (!response.success) {
    console.error(`[Auth Service] Failed to get user ${userId} via api-client: ${response.error}`);
  } else {
    console.log(`[Auth Service] Successfully fetched user ${userId} via api-client.`);
  }
  
  return response;
} 