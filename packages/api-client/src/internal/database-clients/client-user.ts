// packages/api-client/src/database-clients/platform-user.ts

/**
 * Typed API client functions for interacting with User endpoints in the Database Service.
 * Focuses on fetching Client User details relevant to other services.
 */
import { 
    ServiceResponse,
    ClientUser, // For platform user creation
    ClientUserRecord,
    // Import only necessary types from @agent-base/types
    // Add specific record/input types here if they become available and are needed
} from '@agent-base/types';
import { makeClientAuthValidationRequest } from '../../utils/service-client.js'; // Reverted import, added .js
import { getDatabaseServiceUrl } from '../../utils/config.js'; // Added .js
import { Method } from 'axios';

// Ensure the URL points to the correct database service
// Removed top-level constant: const DATABASE_SERVICE_URL = ...

// ==============================================================================
// Client User Client Functions
// ==============================================================================

/**
 * Creates or retrieves a client user record via the database service.
 * Corresponds to: POST /client-users
 * Sends platformUserId and platformClientUserId in the request body.
 * Requires platformUserId for the authentication header (x-platform-user-id).
 * 
 * @param {UpsertClientUserInput} data - The data containing platformUserId and platformClientUserId.
 * @param {string} platformUserId - The ID of the platform user making the request (for x-platform-user-id header).
 * @returns {Promise<ServiceResponse<ClientUser>>} A promise resolving to a ServiceResponse containing the upserted ClientUser data or an error.
 */
export const upsertClientUserApiClient = async (
  clientAuthUserId: string,
  clientAuthOrganizationId: string,
  platformUserId: string
): Promise<ServiceResponse<ClientUser>> => {

  const input = {
    serviceUrl: getDatabaseServiceUrl(),
    method: 'POST' as Method,
    endpoint: '/client-users',
    clientAuthUserId: clientAuthUserId, // Required
    clientAuthOrganizationId: clientAuthOrganizationId, // Required
    platformUserId: platformUserId, // Required
  }
  return makeClientAuthValidationRequest<ClientUser>( // Reverted function call
    input.serviceUrl,
    input.method as Method,
    input.endpoint,
    input.clientAuthUserId,
    input.clientAuthOrganizationId,
    input.platformUserId // Required
    // data and params are undefined for this GET request
  );
};
  