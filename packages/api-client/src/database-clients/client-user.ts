// packages/api-client/src/database-clients/platform-user.ts

/**
 * Typed API client functions for interacting with User endpoints in the Database Service.
 * Focuses on fetching Client User details relevant to other services.
 */
import { 
    ServiceResponse,
    PlatformUser,             // For platform user operations
    GetOrCreatePlatformUserInput,
    ClientUser, // For platform user creation
    // Import only necessary types from @agent-base/types
    // Add specific record/input types here if they become available and are needed
} from '@agent-base/types';
import { makeAPIServiceRequest } from '../utils/service-client';

// Ensure the URL points to the correct database service
const DATABASE_SERVICE_URL = process.env.DATABASE_SERVICE_URL || 'http://localhost:3006';


// ==============================================================================
// Client User Client Functions
// ==============================================================================

/**
 * Fetches a client user's profile information using their ID via the /users/me endpoint.
 * Corresponds to: GET /users/me 
 * This database service endpoint uses the x-client-user-id header for identification.
 * Requires both clientUserId and platformUserId for the outgoing request headers.
 * 
 * @param clientUserId - The ID of the client user to fetch. Passed in x-client-user-id header.
 * @param platformUserId - The ID of the platform user making the request. Passed in x-platform-user-id header.
 * @returns A promise resolving to a ServiceResponse containing the user data (as BasicUserRecord) or an error.
 */
export const getClientUserByIdApiClient = async (
  clientUserId: string,
  platformUserId: string,
  platformApiKey: string
): Promise<ServiceResponse<ClientUser>> => { 

  // Define the target endpoint
  const endpoint = '/users/me'; 

  // Call the authenticated service request utility
  // It handles constructing headers and making the request
  // We expect the response data to conform to BasicUserRecord
  return makeAPIServiceRequest<ClientUser>( 
    DATABASE_SERVICE_URL,
    'GET',
    endpoint,
    platformUserId, // For x-platform-user-id header
    clientUserId,   // For x-client-user-id header
    platformApiKey, // For x-platform-api-key header
    undefined,      // No request body for GET
    undefined       // No query parameters needed (endpoint uses headers)
  );
};
  