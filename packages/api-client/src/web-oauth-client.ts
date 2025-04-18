// packages/api-client/src/web-oauth-clients/auth-client.ts

/**
 * Typed API client functions for interacting with the Web OAuth Service Authentication Endpoints.
 */
import { 
    ServiceResponse,
    PlatformUser
  } from '@agent-base/types';
import axios, { AxiosError } from 'axios';
import { makeWebAnonymousServiceRequest } from './utils/service-client';
import { getWebOauthServiceUrl } from './utils/config';

  // ==============================================================================
  // Web OAuth Service - Auth Client Functions
  // ==============================================================================
  
  /**
   * Validates the authentication token by calling the service.
   * 
   * Corresponds to: POST /auth/validate
   * 
   * @param token - The JWT token to validate (sent in Authorization header).
   * @returns A ServiceResponse containing the PlatformUser object if valid, or an error.
   */
  export const validateAuthToken = async (
    token: string
  ): Promise<ServiceResponse<PlatformUser>> => {
    if (!token) {
      return { success: false, error: '[api-client:validateAuthToken] Token is required.' };
    }
    const endpoint = '/validate';
    const url = `${getWebOauthServiceUrl()}${endpoint}`;
    console.log(`[api-client] Validating token via POST to ${url}`);

    try {
      const response = await axios.post<ServiceResponse<PlatformUser>>(
        url,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000 
        }
      );

      if (response.data && typeof response.data.success === 'boolean') {
        console.log(`[api-client] Received validation response: success=${response.data.success}`);
        return response.data;
      } else {
        console.warn(`[api-client] Received non-standard response from ${url}`);
        if (response.status >= 200 && response.status < 300 && response.data) {
          return { success: true, data: response.data as PlatformUser };
        } 
        return { success: false, error: 'Received non-standard response format from auth service' };
      }

    } catch (error) {
      console.error(`[api-client:validateAuthToken] Error validating token:`, error);
      if (axios.isAxiosError(error)) {
        const status = error.response?.status || 'unknown';
        const responseData = error.response?.data;
        const specificError = responseData?.error || error.message;
        console.error(`[api-client] Axios error details: Status=${status}, Response=${JSON.stringify(responseData)}`);
        return {
          success: false,
          error: specificError || `Token validation failed (Status: ${status})`
        };
      } else {
        return { 
          success: false, 
          error: `Internal error during token validation: ${error instanceof Error ? error.message : 'Unknown error'}` 
        };
      }
    }
  };
  
  /**
   * Refreshes the authentication token (likely via cookie).
   * Note: The actual token is expected to be sent/received automatically (e.g., via cookie handling).
   * 
   * Corresponds to: POST /auth/refresh
   * 
   * @param platformUserId - Placeholder ID for makeServiceRequest header (endpoint auth uses cookie).
   * @returns A ServiceResponse indicating success or failure.
   */
  export const refreshAuthToken = async (
  ): Promise<ServiceResponse<{}>> => {
    const endpoint = '/refresh';
    return makeWebAnonymousServiceRequest<{
    }>(
      getWebOauthServiceUrl(),
      'POST',
      endpoint,
    );
  };
  
  /**
   * Logs the user out by clearing authentication tokens (likely via cookie).
   * 
   * Corresponds to: POST /auth/logout
   * 
   * @param platformUserId - Placeholder ID for makeServiceRequest header.
   * @returns A ServiceResponse indicating success or failure.
   */
  export const logoutUser = async (
  ): Promise<ServiceResponse<{}>> => {
    const endpoint = '/logout';
    return makeWebAnonymousServiceRequest<{
    }>(
      getWebOauthServiceUrl(),
      'POST',
      endpoint,
    );
  };
  