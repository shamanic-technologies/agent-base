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
  ProviderUser,
  makeServiceRequest // Import the shared utility
} from '@agent-base/types';

const dbServiceUrl = config.databaseServiceUrl;

/**
 * Saves or retrieves a user in the database service based on provider ID.
 * Uses the shared httpClient utility.
 * 
 * @param user User information from the OAuth provider
 * @returns Promise resolving to the platform user data
 */
export async function getOrCreateUserToDatabase(user: ProviderUser): Promise<ServiceResponse<PlatformUser>> {
  console.log(`[Auth Service] Calling database service: get-or-create user for provider ID ${user.id}`);
  
  const userData: GetOrCreatePlatformUserInput = {
    provider_user_id: user.id,
    email: user.email,
    display_name: user.name,
    profile_image: user.picture
  };
  
  // Use the shared httpClient for the request
  const response = await makeServiceRequest<PlatformUser>(
    dbServiceUrl, // Base URL of the database service
    'POST',       // HTTP Method
    '/users/get-or-create-by-provider-user-id', // Endpoint
    undefined,    // No specific platformUserId to propagate *for this action*
    userData      // Request body data
    // No query params needed
  );
  
  // Log based on success or failure from the standardized response
  if (!response.success) {
    console.error(`[Auth Service] Failed to save/get user from database service: ${response.error}`);
  } else {
    console.log(`[Auth Service] Successfully saved/retrieved user from database service.`);
  }
  
  // Return the standardized response directly
  return response;
}

/**
 * Retrieves a user from the database service by their platform ID.
 * Uses the shared httpClient utility.
 * 
 * @param userId The platform user ID (UUID)
 * @returns Promise resolving to the user data or null if not found
 */
export async function getUserFromDatabase(userId: string): Promise<ServiceResponse<PlatformUser>> {
  console.log(`[Auth Service] Calling database service: get user by platform ID ${userId}`);

  // Use the shared httpClient for the request
  const response = await makeServiceRequest<PlatformUser>(
    dbServiceUrl, // Base URL of the database service
    'GET',        // HTTP Method
    `/users/${userId}`, // Endpoint including the user ID
    userId        // Propagate the userId we are fetching for context
    // No request body data needed for GET
    // No query params needed
  );

  // Log based on success or failure from the standardized response
  if (!response.success) {
    console.error(`[Auth Service] Failed to get user ${userId} from database service: ${response.error}`);
  } else {
    console.log(`[Auth Service] Successfully fetched user ${userId} from database service.`);
  }
  
  // Return the standardized response directly
  return response;
} 