// packages/api-client/src/database-clients/platform-user.ts

/**
 * Typed API client functions for interacting with User endpoints in the Database Service.
 * Focuses on fetching Client User details relevant to other services.
 */
import { 
    ServiceResponse,
    PlatformUser,             // For platform user operations
    GetOrCreatePlatformUserInput, // For platform user creation
    // Import only necessary types from @agent-base/types
    // Add specific record/input types here if they become available and are needed
} from '@agent-base/types';
import { makeWebAuthenticatedServiceRequest } from '../utils/service-client';

// Ensure the URL points to the correct database service
const DATABASE_SERVICE_URL = process.env.DATABASE_SERVICE_URL || 'http://localhost:3006';


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

    const endpoint = '/platform-users/me'; 
  return makeWebAuthenticatedServiceRequest<PlatformUser>(
    DATABASE_SERVICE_URL,
    'GET',
    endpoint,
    platformUserId // Pass the ID for the header
    // No params or data needed for this GET request
  );
};

/**
 * Gets or creates a platform user based on external auth ID and email.
 * Corresponds to: POST /users/get-or-create-platform-user
 */
export const getOrCreatePlatformUser = async (
  data: GetOrCreatePlatformUserInput,
  platformUserId: string // Assuming this IS required by the endpoint
): Promise<ServiceResponse<PlatformUser>> => {
  const endpoint = '/users/get-or-create-platform-user';
  
  return makeWebAuthenticatedServiceRequest<PlatformUser>(
    DATABASE_SERVICE_URL,
    'POST',
    endpoint,
    platformUserId, 
    undefined, // No clientUserId relevant here
    data       
  );
};
