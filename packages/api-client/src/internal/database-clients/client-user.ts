// packages/api-client/src/database-clients/platform-user.ts

/**
 * Typed API client functions for interacting with User endpoints in the Database Service.
 * Focuses on fetching Client User details relevant to other services.
 */
import { 
    ServiceResponse,
    ClientUser, // For platform user creation
    ClientUserRecord,
    ClientOrganization,
    GetOrCreatePlatformUserInput,
    GetOrCreateClientUserInput,
    // Import only necessary types from @agent-base/types
    // Add specific record/input types here if they become available and are needed
} from '@agent-base/types';
import { makeClientAuthValidationRequest, makeInternalRequest } from '../../utils/service-client.js'; // Reverted import, added .js
import { getDatabaseServiceUrl, getUserServiceUrl } from '../../utils/config.js'; // Added .js
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

/**
 * Creates or retrieves a client organization record via the database service.
 * Corresponds to: POST /client-organizations
 * Sends platformUserId and clientAuthOrganizationId in the request body.
 * Requires platformUserId for the authentication header (x-platform-user-id).
 * 
 * @param {UpsertClientUserInput} data - The data containing platformUserId and platformClientUserId.
 * @param {string} platformUserId - The ID of the platform user making the request (for x-platform-user-id header).
 * @returns {Promise<ServiceResponse<ClientOrganization>>} A promise resolving to a ServiceResponse containing the upserted ClientOrganization data or an error.
 */
export const upsertClientOrganizationApiClient = async (
  clientAuthUserId: string,
  clientAuthOrganizationId: string,
  platformUserId: string
): Promise<ServiceResponse<ClientOrganization>> => {

  const input = {
    serviceUrl: getDatabaseServiceUrl(),
    method: 'POST' as Method,
    endpoint: '/client-organizations',
    clientAuthUserId: clientAuthUserId, // Required
    clientAuthOrganizationId: clientAuthOrganizationId, // Required
    platformUserId: platformUserId, // Required
  }
  return makeClientAuthValidationRequest<ClientOrganization>( // Reverted function call
    input.serviceUrl,
    input.method as Method,
    input.endpoint,
    input.clientAuthUserId,
    input.clientAuthOrganizationId,
    input.platformUserId // Required
    // data and params are undefined for this GET request
  );
};

// /**
//  * Fetches the current platform user's data based on the propagated ID.
//  * 
//  * Corresponds to: GET /platform-users/me
//  * 
//  * @param platformUserId - The platform user ID (typically from headers, passed explicitly here).
//  * @returns A ServiceResponse containing the PlatformUser object or an error.
//  */
// export const getCurrentClientUser = async (
//   clientUserId: string
// ): Promise<ServiceResponse<ClientUser>> => {

//     const endpoint = '/client-users/me'; 
//   return makeWebAuthenticatedServiceRequest<ClientUser>(
//     getDatabaseServiceUrl(), // Use dynamic getter
//     'GET',
//     endpoint,
//     clientUserId // Pass the ID for the header
//     // No params or data needed for this GET request
//   );
// };

// /**
//  * Gets or creates a platform user based on external auth ID and email.
//  * Corresponds to: POST /platform-users/get-or-create-by-provider-user-id
//  */
// export const getOrCreateClientUser = async (
//   data: GetOrCreateClientUserInput,
// ): Promise<ServiceResponse<ClientUser>> => {
//   const endpoint = '/client-users/get-or-create-by-provider-user-id';
  
//   return makeWebAnonymousServiceRequest<ClientUser>(
//     getDatabaseServiceUrl(), // Use dynamic getter
//     'POST',
//     endpoint,
//     data,       // Send data in the body
//     undefined   // No params needed
//   );
// };
