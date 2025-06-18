/**
 * API Client for interacting with the Key Service
 */
// import axios, { AxiosError } from 'axios'; // No longer needed directly
import {
  ServiceResponse,
  PlatformUserId,
  HumanInternalCredentials,
  ClientOrganization,
  UpdateClientOrganizationInput,
} from '@agent-base/types';

// Import the shared request helpers
import { 
  makeWebAnonymousServiceRequest,
  makeInternalRequest
} from '../utils/service-client.js';

import { getUserServiceUrl } from '../utils/config.js'; // Changed to getUserServiceUrl
import { Method } from 'axios';

// --- Endpoint Client Functions --- //

/**
 * Validates a platform user.
 * POST /platform-user/validate
 *
 * @param platformAuthUserId - The platform user ID to validate.
 * @returns A promise resolving to ServiceResponse<PlatformUserId>.
 */
export const validatePlatformUser = async (
  platformAuthUserId: string
): Promise<ServiceResponse<PlatformUserId>> => {

  const endpoint = '/auth-user/validate-platform-user'; // Endpoint path
  const input = {
    serviceUrl: getUserServiceUrl(),
    method: 'post',
    endpoint: endpoint,
    platformAuthUserId: platformAuthUserId,
  };
  // Use the helper function, passing the key in the body
  return await makeWebAnonymousServiceRequest<PlatformUserId>(
    input.serviceUrl,
    input.method as Method,
    input.endpoint,
    { platformAuthUserId: input.platformAuthUserId } // Send as an object
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
 * @returns {Promise<ServiceResponse<boolean>>} A promise resolving to a ServiceResponse containing the upserted ClientUser data or an error.
 */
export const validateClientUserClientOrganization = async (
  platformApiKey: string,
  platformUserId: string,
  clientUserId: string,
  clientOrganizationId: string
): Promise<ServiceResponse<boolean>> => {

  const input = {
    serviceUrl: getUserServiceUrl(),
    method: 'POST' as Method,
    endpoint: '/validate-client-user-client-organization',
    platformApiKey: platformApiKey, // Required
    platformUserId: platformUserId, // Required
    clientUserId: clientUserId, // Required
    clientOrganizationId: clientOrganizationId, // Required
  }
  
  return makeInternalRequest<boolean>( // Reverted function call
    input.serviceUrl,
    input.method as Method,
    input.endpoint,
    input.platformUserId,
    input.clientUserId,
    input.clientOrganizationId,
    input.platformApiKey,
    undefined,
    undefined,
    // data and params are undefined for this GET request
  );
};

/**
 * Fetches all organizations for a given user from the user-service.
 * GET /auth-user/organizations
 *
 * @param {HumanInternalCredentials} credentials - The internal credentials for the user.
 * @returns {Promise<ServiceResponse<ClientOrganization[]>>} A promise resolving to a ServiceResponse containing the list of organizations.
 */
export const getOrganizationsForUser = async (
  credentials: HumanInternalCredentials,
): Promise<ServiceResponse<ClientOrganization[]>> => {
  const { platformApiKey, platformUserId, clientUserId, clientOrganizationId } = credentials;

  return makeInternalRequest<ClientOrganization[]>(
    getUserServiceUrl(),
    'GET' as Method,
    '/auth-user/organizations',
    platformUserId,
    clientUserId,
    clientOrganizationId,
    platformApiKey,
  );
};

