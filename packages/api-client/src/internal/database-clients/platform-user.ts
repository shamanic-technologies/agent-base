// packages/api-client/src/database-clients/platform-user.ts

/**
 * Typed API client functions for interacting with User endpoints in the Database Service.
 * Focuses on fetching Client User details relevant to other services.
 */
import { 
    ServiceResponse,
    PlatformUser,             // For platform user operations
    GetOrCreatePlatformUserInput, // For platform user creation
    PlatformUserRecord,
    // Import only necessary types from @agent-base/types
    // Add specific record/input types here if they become available and are needed
} from '@agent-base/types';
import { makeWebAuthenticatedServiceRequest, makeWebAnonymousServiceRequest } from '../../utils/service-client.js';
import { getDatabaseServiceUrl } from '../../utils/config.js'; // Import the centralized getter
import { Method } from 'axios';


/**
 * Fetches the current platform user's data based on the propagated ID.
 * 
 * Corresponds to: GET /platform-users/me
 * 
 * @param platformUserId - The platform user ID (typically from headers, passed explicitly here).
 * @returns A ServiceResponse containing the PlatformUser object or an error.
 */
export const getCurrentPlatformUser = async (
  platformUserId: string,
  platformOrganizationId: string
): Promise<ServiceResponse<PlatformUser>> => {

    const endpoint = '/platform-users/me'; 
  return makeWebAuthenticatedServiceRequest<PlatformUser>(
    getDatabaseServiceUrl(), // Use dynamic getter
    'GET',
    endpoint,
    platformUserId, // Pass the ID for the header
    platformOrganizationId
    // No params or data needed for this GET request
  );
};

/**
 * Gets or creates a platform user based on external auth ID and email.
 * Corresponds to: POST /platform-users/get-or-create-by-auth-user-id
 */
export const getOrCreatePlatformUser = async (
  data: GetOrCreatePlatformUserInput,
): Promise<ServiceResponse<PlatformUser>> => {
  const endpoint = '/platform-users/get-or-create-by-platform-auth-user-id';
  
  return makeWebAnonymousServiceRequest<PlatformUser>(
    getDatabaseServiceUrl(), // Use dynamic getter
    'POST',
    endpoint,
    data,       // Send data in the body
    undefined   // No params needed
  );
};
