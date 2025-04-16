// packages/api-client/src/databaseClient.ts

/**
 * Typed API client functions for interacting with the Database Service.
 */
import { 
    ServiceResponse,
    PlatformUser,             // Import the PlatformUser type
    GetOrCreatePlatformUserInput, // Import the input type

  } from '@agent-base/types';
  import { makeAnonymousServiceRequest, makeAuthenticatedServiceRequest } from '../utils/service-client';    
  /**
   * Base URL for the Database Service.
   * It's recommended to load this from environment variables.
   */
  const DATABASE_SERVICE_URL = process.env.DATABASE_SERVICE_URL || 'http://localhost:3006'; // TODO: Replace with actual env var
  
  if (!process.env.DATABASE_SERVICE_URL) {
    console.warn('[api-client] DATABASE_SERVICE_URL environment variable not set. Defaulting to http://localhost:3001');
  }
  
  // ==============================================================================
  // Platform User Client Functions
  // ==============================================================================
  
  /**
   * Fetches the current platform user's data based on the propagated ID.
   * 
   * Corresponds to: GET /platform-users/me
   * 
   * @param platformUserId - The platform user ID (typically from headers, passed explicitly here).
   * @returns A ServiceResponse containing the PlatformUser object or an error.
   */
  export const getCurrentPlatformUser = async (
    platformUserId: string
  ): Promise<ServiceResponse<PlatformUser>> => {
    if (!platformUserId) {
      // Throw error immediately if platformUserId is missing, as it's required by the endpoint
      throw new Error('[api-client:getCurrentPlatformUser] platformUserId is required.');
    }
    const endpoint = '/platform-users/me'; 
    return makeAuthenticatedServiceRequest<PlatformUser>(
      DATABASE_SERVICE_URL,
      'GET',
      endpoint,
      platformUserId // Pass the ID for the header
      // No params or data needed for this GET request
    );
  };
  
  /**
   * Gets or creates a platform user based on their OAuth provider user ID.
   * 
   * Corresponds to: POST /platform-users/get-or-create-by-provider-user-id
   * 
   * @param data - The input data containing providerUserId and optional profile info.
   * @param platformUserId - The platform user ID making the request (used for headers).
   * @returns A ServiceResponse containing the found or created PlatformUser object or an error.
   */
  export const getOrCreatePlatformUser = async (
    data: GetOrCreatePlatformUserInput,
  ): Promise<ServiceResponse<PlatformUser>> => {

    if (!data || !data.providerUserId) {
       // Basic validation matching the endpoint's requirement
       throw new Error('[api-client:getOrCreatePlatformUser] Input data must include providerUserId.');
    }
    const endpoint = '/platform-users/get-or-create-by-provider-user-id'; 
    return makeAnonymousServiceRequest<PlatformUser>(
      DATABASE_SERVICE_URL,
      'POST',
      endpoint,
      data // Pass data as request body
    );
  };
  