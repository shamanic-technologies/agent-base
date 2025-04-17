/**
 * API Client for interacting with the Secret Service
 */
import { 
  ServiceResponse, 
  StoreSecretRequest,
  SecretValue,
  GetSecretRequest
} from '@agent-base/types';
import { makeAuthenticatedServiceRequest } from './utils/service-client.js';
  // Determine the correct URL for the web-oauth-service
  const SECRET_SERVICE_URL = process.env.SECRET_SERVICE_URL || 'http://localhost:3070';
  
  if (!process.env.SECRET_SERVICE_URL) {
    console.warn('[api-client] SECRET_SERVICE_URL environment variable not set. Defaulting to http://localhost:3070');
  }

export async function storeSecret(
  platformUserId: string, 
  storeSecretRequest: StoreSecretRequest
): Promise<ServiceResponse<string>> {

  return await makeAuthenticatedServiceRequest<string>(
    SECRET_SERVICE_URL,
    'post',
    '/api/store-secret', // Use the correct endpoint from secretService.ts
    platformUserId,
    storeSecretRequest
  );
}


export async function getSecret(
  platformUserId: string, 
  getSecretRequest: GetSecretRequest
): Promise<ServiceResponse<SecretValue>> {

  return await makeAuthenticatedServiceRequest<SecretValue>(
    SECRET_SERVICE_URL,
    'get',
    `/api/get-secret`, // Use the correct endpoint from secretService.ts
    platformUserId,
    undefined, // No request body for GET
    getSecretRequest // Pass secretType as query parameter
  );
} 