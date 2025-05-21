/**
 * API Client for interacting with the Key Service
 */
// import axios, { AxiosError } from 'axios'; // No longer needed directly
import {
  ServiceResponse,
  // ApiKey, // Removed as no longer used here
  // SecretValue, // Removed as no longer used here
  PlatformUserId,
  // GetApiKeyByIdRequest, // Removed as no longer used here
  // GetApiKeyByNameRequest, // Removed as no longer used here
  // InternalServiceCredentials // Removed as no longer used here
} from '@agent-base/types';

// Import the shared request helpers
import { 
  // makeWebAuthenticatedServiceRequest, // Removed as no longer used here
  // makePlatformUserValidationRequest, // Removed as no longer used here
  // makeInternalAPIServiceRequest, // Removed as no longer used here
  makeWebAnonymousServiceRequest
} from '../utils/service-client.js';

import { getUserServiceUrl } from '../utils/config.js'; // Changed to getUserServiceUrl
import { Method } from 'axios';

// --- Endpoint Client Functions --- //

/**
 * Validates a platform API key using the Key Service.
 * POST /validate
 *
 * Note: Uses an *anonymous* service request as validation doesn't require pre-authentication.
 *
 * @param providerUserId - The provider user ID to validate.
 * @returns A promise resolving to ServiceResponse<PlatformUserId>.
 */
export const validateProviderUser = async (
  providerUserId: string
): Promise<ServiceResponse<PlatformUserId>> => {

  const endpoint = '/provider-users/validate'; // Endpoint path
  const input = {
    serviceUrl: getUserServiceUrl(),
    method: 'post',
    endpoint: endpoint,
    providerUserId: providerUserId,
  };
  // Use the helper function, passing the key in the body
  return await makeWebAnonymousServiceRequest<PlatformUserId>(
    input.serviceUrl,
    input.method as Method,
    input.endpoint,
    input.providerUserId
  );

};

// Removed listPlatformApiKeys
// Removed getPlatformApiKeySecretById
// Removed getOrCreatePlatformApiKeySecretByName