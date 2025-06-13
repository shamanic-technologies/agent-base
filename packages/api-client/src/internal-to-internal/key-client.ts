/**
 * API Client for interacting with the Key Service
 */
// import axios, { AxiosError } from 'axios'; // No longer needed directly
import {
  ServiceResponse,
  ApiKey,
  SecretValue,
  PlatformUserId,
  GetApiKeyByIdRequest,
  GetApiKeyByNameRequest,
} from '@agent-base/types';

// Import the shared request helpers
import { 
  makeWebAuthenticatedServiceRequest, 
  makePlatformUserValidationRequest,
} from '../utils/service-client.js';

import { getKeyServiceUrl } from '../utils/config.js'; // Added .js
import { Method } from 'axios';

// --- Endpoint Client Functions --- //

/**
 * Validates a platform API key using the Key Service.
 * POST /validate
 *
 * Note: Uses an *anonymous* service request as validation doesn't require pre-authentication.
 *
 * @param platformApiKeySecret - The platform API key secret to validate.
 * @returns A promise resolving to ServiceResponse<PlatformUserId>.
 */
export const validatePlatformApiKeySecret = async (
  platformApiKeySecret: SecretValue
): Promise<ServiceResponse<PlatformUserId>> => {

  const endpoint = '/validate'; // Endpoint path
  const input = {
    serviceUrl: getKeyServiceUrl(),
    method: 'post',
    endpoint: endpoint,
    platformApiKey: platformApiKeySecret.value as string,
  };
  // Use the helper function, passing the key in the body
  return await makePlatformUserValidationRequest<PlatformUserId>(
    input.serviceUrl,
    input.method as Method,
    input.endpoint,
    input.platformApiKey
  );

};

/**
 * Lists API key metadata for a specific platform user.
 * GET /
 *
 * @param platformUserId - The ID of the platform user whose keys to list.
 * @returns A promise resolving to ServiceResponse<ApiKey[]>.
 */
export const listPlatformApiKeys = async (
  platformUserId: PlatformUserId,
  platformOrganizationId: string
): Promise<ServiceResponse<ApiKey[]>> => {
  if (!platformUserId) {
    return { success: false, error: 'platformUserId is required for listApiKeys.' };
  }
  return await makeWebAuthenticatedServiceRequest<ApiKey[]>(
    getKeyServiceUrl(), // Use dynamic getter
    'get',
    '/',
    platformUserId.platformUserId,
    platformOrganizationId
  );
};

/**
 * Retrieves an API key secret by its ID for a specific platform user.
 * GET /:keyId
 *
 * @param input - Object containing platformUserId and keyId.
 * @returns A promise resolving to ServiceResponse<SecretValue>.
 */
export const getPlatformApiKeySecretById = async (
  input: GetApiKeyByIdRequest
): Promise<ServiceResponse<SecretValue>> => {
  const { platformUserId, platformOrganizationId, keyId } = input;
  if (!platformUserId) {
    return { success: false, error: 'platformUserId is required for getApiKeyById.' };
  }
  if (!keyId) {
    return { success: false, error: 'Key ID parameter is required.' };
  }
  return await makeWebAuthenticatedServiceRequest<SecretValue>(
    getKeyServiceUrl(), // Use dynamic getter
    'get',
    `/${keyId}`,
    platformUserId,
    platformOrganizationId
  );
};

/**
 * Retrieves or creates an API key secret by its name for a specific platform user.
 * GET /by-name?name=<keyName>
 *
 * @param input - Object containing platformUserId and keyName.
 * @returns A promise resolving to ServiceResponse<SecretValue>.
 */
export const getOrCreatePlatformApiKeySecretByName = async (
  input: GetApiKeyByNameRequest
): Promise<ServiceResponse<SecretValue>> => {
  const { platformUserId, platformOrganizationId, keyName } = input;

  const queryParams = { name: keyName };
  return await makeWebAuthenticatedServiceRequest<SecretValue>(
    getKeyServiceUrl(), // Use dynamic getter
    'get',
    '/by-name',
    platformUserId,
    platformOrganizationId,
    undefined, // No body
    queryParams
  );
};