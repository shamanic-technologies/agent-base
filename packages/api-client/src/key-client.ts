/**
 * API Client for interacting with the Key Service
 */
// import axios, { AxiosError } from 'axios'; // No longer needed directly
import {
  ServiceResponse,
  ApiKey,
  SecretValue,
  PlatformUser
} from '@agent-base/types';

// Import the shared request helpers
import { 
  makeWebAuthenticatedServiceRequest, 
  makeWebAnonymousServiceRequest,
  makePlatformUserValidationRequest
} from './utils/service-client.js';
import { getKeyServiceUrl } from './utils/config'; // Import the centralized getter
import { Method } from 'axios';

// --- Types --- //
export type PlatformUserIdData = {
  platformUserId: string;
}
export type PlatformAPIKeySecretData = {
  platformAPIKeySecret: string;
};

export interface GetApiKeyByNameRequest {
  platformUserId: string;
  keyName: string;
}

export interface GetApiKeyByIdRequest {
  platformUserId: string;
  keyId: string;
}


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
  platformApiKeySecret: PlatformAPIKeySecretData
): Promise<ServiceResponse<PlatformUserIdData>> => {

  const endpoint = '/validate'; // Endpoint path
  const input = {
    serviceUrl: getKeyServiceUrl(),
    method: 'post',
    endpoint: endpoint,
    platformApiKey: platformApiKeySecret.platformAPIKeySecret,
  };
  // Use the helper function, passing the key in the body
  return await makePlatformUserValidationRequest<PlatformUserIdData>(
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
  platformUserId: PlatformUserIdData
): Promise<ServiceResponse<ApiKey[]>> => {
  if (!platformUserId) {
    return { success: false, error: 'platformUserId is required for listApiKeys.' };
  }
  return await makeWebAuthenticatedServiceRequest<ApiKey[]>(
    getKeyServiceUrl(), // Use dynamic getter
    'get',
    '/',
    platformUserId.platformUserId
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
  const { platformUserId, keyId } = input;
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
    platformUserId
  );
};

/**
 * Retrieves or creates an API key secret by its name for a specific platform user.
 * GET /by-name?name=<keyName>
 *
 * @param input - Object containing platformUserId and keyName.
 * @returns A promise resolving to ServiceResponse<SecretValue>.
 */
export const getPlatformApiKeySecretByName = async (
  input: GetApiKeyByNameRequest
): Promise<ServiceResponse<SecretValue>> => {
  const { platformUserId, keyName } = input;
  if (!platformUserId) {
    return { success: false, error: 'platformUserId is required for getApiKeyByName.' };
  }
  if (!keyName) {
    return { success: false, error: 'Key name query parameter is required.' };
  }
  const queryParams = { name: keyName };
  return await makeWebAuthenticatedServiceRequest<SecretValue>(
    getKeyServiceUrl(), // Use dynamic getter
    'get',
    '/by-name',
    platformUserId,
    undefined, // No body
    queryParams
  );
};