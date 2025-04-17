/**
 * API Client for interacting with the Key Service
 */
// import axios, { AxiosError } from 'axios'; // No longer needed directly
import {
  ServiceResponse,
  ApiKey,
  SecretValue
} from '@agent-base/types';

// Import the shared request helpers
import { 
  makeAuthenticatedServiceRequest, 
  makeAnonymousServiceRequest // Add this import
} from './utils/service-client.js';

// --- Key Service URL Configuration --- //
const KEY_SERVICE_URL = process.env.KEY_SERVICE_URL || 'http://localhost:3003';
if (!process.env.KEY_SERVICE_URL) {
  console.warn('[api-client/key-client] KEY_SERVICE_URL environment variable not set. Defaulting to ' + KEY_SERVICE_URL);
}

// --- Types --- //
type PlatformUserId = string;
type PlatformAPIKeySecret = string;

export interface GetApiKeyByNameRequest {
  platformUserId: PlatformUserId;
  keyName: string;
}

export interface GetApiKeyByIdRequest {
  platformUserId: PlatformUserId;
  keyId: string;
}

// Define the payload for the validation request
interface ValidateKeyPayload {
  apiKey: PlatformAPIKeySecret; // Match naming
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
  platformApiKeySecret: PlatformAPIKeySecret
): Promise<ServiceResponse<PlatformUserId>> => {
  const payload: ValidateKeyPayload = { apiKey: platformApiKeySecret };
  const endpoint = '/validate'; // Endpoint path

  // Use the anonymous helper, as this endpoint performs the authentication
  return await makeAnonymousServiceRequest<PlatformUserId>(
    KEY_SERVICE_URL,
    'post',
    endpoint,
    payload // Send API key in the body
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
  platformUserId: PlatformUserId
): Promise<ServiceResponse<ApiKey[]>> => {
  if (!platformUserId) {
    return { success: false, error: 'platformUserId is required for listApiKeys.' };
  }
  return await makeAuthenticatedServiceRequest<ApiKey[]>(
    KEY_SERVICE_URL,
    'get',
    '/',
    platformUserId
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
  return await makeAuthenticatedServiceRequest<SecretValue>(
    KEY_SERVICE_URL,
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
  return await makeAuthenticatedServiceRequest<SecretValue>(
    KEY_SERVICE_URL,
    'get',
    '/by-name',
    platformUserId,
    undefined, // No body
    queryParams
  );
};