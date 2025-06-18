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
    HumanInternalCredentials,
    UpdateClientOrganizationInput,
    // Import only necessary types from @agent-base/types
    // Add specific record/input types here if they become available and are needed
} from '@agent-base/types';
import { makeClientUserValidationRequest, makeClientOrganizationValidationRequest, makeInternalRequest } from '../../utils/service-client.js'; // Reverted import, added .js
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
  platformUserId: string
): Promise<ServiceResponse<ClientUser>> => {

  const input = {
    serviceUrl: getDatabaseServiceUrl(),
    method: 'POST' as Method,
    endpoint: '/client-users',
    clientAuthUserId: clientAuthUserId, // Required
    platformUserId: platformUserId, // Required
  }
  return makeClientUserValidationRequest<ClientUser>( // Reverted function call
    input.serviceUrl,
    input.method as Method,
    input.endpoint,
    input.clientAuthUserId,
    input.platformUserId // Required
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
  clientUserId: string,
  clientAuthOrganizationId: string,
): Promise<ServiceResponse<ClientOrganization>> => {

  const input = {
    serviceUrl: getDatabaseServiceUrl(),
    method: 'POST' as Method,
    endpoint: '/client-organizations',
    clientUserId: clientUserId, // Required
    clientAuthOrganizationId: clientAuthOrganizationId, // Required
  }
  return makeClientOrganizationValidationRequest<ClientOrganization>( // Reverted function call
    input.serviceUrl,
    input.method as Method,
    input.endpoint,
    input.clientUserId,
    input.clientAuthOrganizationId,
  );
};

/**
 * Fetches all organizations for a given client user.
 * @param {HumanInternalCredentials} credentials - The internal credentials.
 * @returns {Promise<ServiceResponse<ClientOrganization[]>>} A promise resolving to a ServiceResponse containing the list of organizations or an error.
 */
export const getOrganizationsForClientUserApiClient = async (
  credentials: HumanInternalCredentials
): Promise<ServiceResponse<ClientOrganization[]>> => {
  const { platformUserId, clientUserId, clientOrganizationId, platformApiKey } = credentials;
  const endpoint = `/client-users/${clientUserId}/organizations`;

  return makeInternalRequest<ClientOrganization[]>(
    getDatabaseServiceUrl(),
    'GET',
    endpoint,
    platformUserId,
    clientUserId,
    clientOrganizationId,
    platformApiKey
  );
};
/**
 * Updates an organization.
 * @param {string} organizationId - The ID of the organization to update.
 * @param {UpdateClientOrganizationInput} updates - The fields to update.
 * @param {HumanInternalCredentials} credentials - The internal credentials.
 * @returns {Promise<ServiceResponse<ClientOrganization>>} The updated organization data.
 */
export const updateOrganizationApiClient = async (
  organizationId: string,
  updates: UpdateClientOrganizationInput,
  credentials: HumanInternalCredentials
): Promise<ServiceResponse<ClientOrganization>> => {
  const { platformUserId, clientUserId, clientOrganizationId, platformApiKey } = credentials;
  const endpoint = `/client-organizations/${organizationId}`;

  return makeInternalRequest<ClientOrganization>(
    getDatabaseServiceUrl(),
    'PUT',
    endpoint,
    platformUserId,
    clientUserId,
    clientOrganizationId,
    platformApiKey,
    updates
  );
};

/**
 * Deletes an organization.
 * @param {string} organizationId - The ID of the organization to delete.
 * @param {HumanInternalCredentials} credentials - The internal credentials.
 * @returns {Promise<ServiceResponse<boolean>>} Success status.
 */
export const deleteOrganizationApiClient = async (
  organizationId: string,
  credentials: HumanInternalCredentials
): Promise<ServiceResponse<boolean>> => {
  const { platformUserId, clientUserId, clientOrganizationId, platformApiKey } = credentials;
  const endpoint = `/client-organizations/${organizationId}`;

  return makeInternalRequest<boolean>(
    getDatabaseServiceUrl(),
    'DELETE',
    endpoint,
    platformUserId,
    clientUserId,
    clientOrganizationId,
    platformApiKey
  );
};

