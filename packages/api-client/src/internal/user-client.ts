/**
 * API Client for interacting with the Key Service
 */
// import axios, { AxiosError } from 'axios'; // No longer needed directly
import {
  ServiceResponse,
  PlatformUserId,
} from '@agent-base/types';

// Import the shared request helpers
import { 
  makeWebAnonymousServiceRequest
} from '../utils/service-client.js';

import { getUserServiceUrl } from '../utils/config.js'; // Changed to getUserServiceUrl
import { Method } from 'axios';

// --- Endpoint Client Functions --- //

/**
 * Validates a provider user.
 * POST /provider-user/validate
 *
 * @param platformAuthUserId - The provider user ID to validate.
 * @returns A promise resolving to ServiceResponse<PlatformUserId>.
 */
export const validatePlatformAuthUser = async (
  platformAuthUserId: string
): Promise<ServiceResponse<PlatformUserId>> => {

  const endpoint = '/provider-user/validate'; // Endpoint path
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
