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
 * @param providerUser User information from the OAuth provider
 * @returns Promise resolving to the platform user data
 */
export async function getOrCreateUserInDatabase(providerUser: ProviderUser): Promise<ServiceResponse<PlatformUser>> {
  
  // Use correct camelCase properties for the input type
  const inputData: GetOrCreatePlatformUserInput = {
    providerUserId: providerUser.id,
    email: providerUser.email,
    displayName: providerUser.name,
    profileImage: providerUser.picture
  };
  
  // Use the API client function
  const response = await getOrCreatePlatformUser(inputData);
  
  if (!response.success) {
    console.error(`[Auth Service] Failed to save/get user via api-client: ${response.error}`);
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

  // Use the API client function
  // The client function handles passing the userId for the header
  const response = await getCurrentPlatformUser(userId);

  if (!response.success) {
    console.error(`[Auth Service] Failed to get user ${userId} via api-client: ${response.error}`);
  }
  
  return response;
} 