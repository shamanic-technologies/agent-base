/**
 * HTTP client utility for service-to-service communication
 */
import axios, { AxiosRequestConfig, Method } from 'axios';
import { ServiceResponse } from '@agent-base/types';

/**
 * Base logic for making service requests and handling responses/errors.
 * Internal helper function.
 */
async function _makeServiceRequest<T>(
  fullUrl: string,
  config: AxiosRequestConfig,
  logContext: string // e.g., '[httpClient:WebAuth]', '[httpClient:ApiAuth]', '[httpClient:Anon]'
): Promise<ServiceResponse<T>> {
  try {
    console.log(`${logContext} Making ${config.method} request to ${fullUrl}`);
    const response = await axios.request<ServiceResponse<T>>(config);

    // Check if the response looks like a standard ServiceResponse
    if (typeof response.data === 'object' && response.data !== null && 'success' in response.data) {
       console.log(`${logContext} Received successful standard response from ${fullUrl}`);
       return response.data;
    } else {
       // If not standard, wrap it assuming success (may need adjustment based on actual service responses)
       console.warn(`${logContext} Received non-standard success response from ${fullUrl}. Wrapping data.`);
       return { success: true, data: response.data as T };
    }
  } catch (error) {
    console.error(`${logContext} Service request error to ${fullUrl}:`, error);
    
    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 'unknown';
      const responseData = error.response?.data;
      const specificError = responseData?.error || error.message; // Prefer specific error from response body
      console.error(`${logContext} Axios error details: Status=${status}, Response=${JSON.stringify(responseData)}`);
      
      return {
        success: false,
        error: specificError || `Service communication error (Status: ${status})`
      };
    } else {
      // Handle non-Axios errors (e.g., network issues before request sends)
      console.error(`${logContext} Non-Axios error during request to ${fullUrl}: ${error}`);
      return { 
        success: false, 
        error: 'Internal error during service request execution' 
      };
    }
  }
}

/**
 * Makes a WEB Authenticated HTTP request (only platformUserId).
 * Includes ONLY the required x-platform-user-id header.
 * 
 * @param serviceUrl - Base URL of the target service.
 * @param method - HTTP method.
 * @param endpoint - API endpoint path.
 * @param platformUserId - Required platform user ID for 'x-platform-user-id' header.
 * @param data - Optional request body.
 * @param params - Optional URL query parameters.
 * @returns Promise<ServiceResponse<T>>.
 * @template T - Expected data payload type.
 */
export async function makeWebAuthenticatedServiceRequest<T>(
  serviceUrl: string,
  method: Method,
  endpoint: string,
  platformUserId: string, // Required
  data?: any,
  params?: any
): Promise<ServiceResponse<T>> {
  const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${serviceUrl}${formattedEndpoint}`;
  const logContext = `[httpClient:WebAuth] User ${platformUserId}`; 

  if (!platformUserId) {
    console.error(`${logContext} platformUserId is strictly required for web authenticated request to ${fullUrl}.`);
    return { success: false, error: 'Internal error: platformUserId missing for web authenticated service request' };
  }

  const config: AxiosRequestConfig = {
    method,
    url: fullUrl,
    params,
    headers: {
      'x-platform-user-id': platformUserId,
    },
    data
  };

  return _makeServiceRequest<T>(fullUrl, config, logContext);
} 

/**
 * Makes an API Authenticated HTTP request (platformUserId, clientUserId, platformApiKey).
 * Includes x-platform-user-id, x-client-user-id, and x-platform-api-key headers.
 * All three auth identifiers are required.
 * 
 * @param serviceUrl - Base URL of the target service.
 * @param method - HTTP method.
 * @param endpoint - API endpoint path.
 * @param platformUserId - Required platform user ID for 'x-platform-user-id' header.
 * @param clientUserId - Required client user ID for 'x-client-user-id' header.
 * @param platformApiKey - Required platform API key for 'x-platform-api-key' header.
 * @param data - Optional request body.
 * @param params - Optional URL query parameters.
 * @param agentId - Optional agent ID for 'x-agent-id' header.
 * @returns Promise<ServiceResponse<T>>.
 * @template T - Expected data payload type.
 */
export async function makeAPIServiceRequest<T>(
  serviceUrl: string,
  method: Method,
  endpoint: string,
  platformUserId: string, // Required
  clientUserId: string,   // Required
  platformApiKey: string, // Required
  data?: any,
  params?: any,
  agentId?: string      // Optional agent ID
): Promise<ServiceResponse<T>> {
  const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${serviceUrl}${formattedEndpoint}`;
  const logContext = `[httpClient:ApiAuth] PlatformUser ${platformUserId}, ClientUser ${clientUserId}${agentId ? ', Agent ' + agentId : ''}`;

  // Validate required parameters
  if (!platformUserId || !clientUserId || !platformApiKey) {
    const missing = [
        !platformUserId ? 'platformUserId' : null,
        !clientUserId ? 'clientUserId' : null,
        !platformApiKey ? 'platformApiKey' : null
    ].filter(Boolean).join(', ');
    console.error(`${logContext} Missing required parameters for API authenticated request to ${fullUrl}: ${missing}.`);
    return {
      success: false,
      error: `Internal error: Missing required parameter(s) for API authenticated service request: ${missing}`
    };
  }

  const config: AxiosRequestConfig = {
    method,
    url: fullUrl,
    params,
    headers: {
      'x-platform-user-id': platformUserId,
      'x-client-user-id': clientUserId,
      'x-platform-api-key': platformApiKey,
      ...(agentId && { 'x-agent-id': agentId }), // Conditionally add x-agent-id if provided
    },
    data
  };

  return _makeServiceRequest<T>(fullUrl, config, logContext);
}

/**
 * Makes an API Authenticated HTTP request (platformUserId, clientUserId, platformApiKey).
 * Includes x-platform-user-id, x-client-user-id, and x-platform-api-key headers.
 * All three auth identifiers are required.
 * 
 * @param serviceUrl - Base URL of the target service.
 * @param method - HTTP method.
 * @param endpoint - API endpoint path.
 * @param platformUserId - Required platform user ID for 'x-platform-user-id' header.
 * @param clientUserId - Required client user ID for 'x-client-user-id' header.
 * @param platformApiKey - Required platform API key for 'x-platform-api-key' header.
 * @param data - Optional request body.
 * @param params - Optional URL query parameters.
 * @returns Promise<ServiceResponse<T>>.
 * @template T - Expected data payload type.
 */
export async function makePlatformUserValidationRequest<T>(
  serviceUrl: string,
  method: Method,
  endpoint: string,
  platformApiKey: string, // Required
): Promise<ServiceResponse<T>> {
  const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${serviceUrl}${formattedEndpoint}`;
  const logContext = `[httpClient:ApiAuth] PlatformApiKey ${platformApiKey}`;

  // Validate required parameters
  if (!platformApiKey) {
    const missing = [
        !platformApiKey ? 'platformApiKey' : null
    ].filter(Boolean).join(', ');
    console.error(`${logContext} Missing required parameters for API authenticated request to ${fullUrl}: ${missing}.`);
    return {
      success: false,
      error: `Internal error: Missing required parameter(s) for API authenticated service request: ${missing}`
    };
  }

  const config: AxiosRequestConfig = {
    method,
    url: fullUrl,
    headers: {
      'x-platform-api-key': platformApiKey,
    },
  };

  return _makeServiceRequest<T>(fullUrl, config, logContext);
}


/**
 * Makes an API Authenticated HTTP request (platformUserId, clientUserId, platformApiKey).
 * Includes x-platform-user-id, x-client-user-id, and x-platform-api-key headers.
 * All three auth identifiers are required.
 * 
 * @param serviceUrl - Base URL of the target service.
 * @param method - HTTP method.
 * @param endpoint - API endpoint path.
 * @param platformUserId - Required platform user ID for 'x-platform-user-id' header.
 * @param clientUserId - Required client user ID for 'x-client-user-id' header.
 * @param platformApiKey - Required platform API key for 'x-platform-api-key' header.
 * @param data - Optional request body.
 * @param params - Optional URL query parameters.
 * @returns Promise<ServiceResponse<T>>.
 * @template T - Expected data payload type.
 */
export async function makeClientUserValidationRequest<T>(
  serviceUrl: string,
  method: Method,
  endpoint: string,
  platformClientUserId: string, // Required
  platformUserId: string, // Required
): Promise<ServiceResponse<T>> {
  const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${serviceUrl}${formattedEndpoint}`;
  const logContext = `[httpClient:ApiAuth] PlatformClient ${platformClientUserId}`;

  // Validate required parameters
  if (!platformClientUserId || !platformUserId) {
    const missing = [
        !platformClientUserId ? 'platformClientUserId' : null,
        !platformUserId ? 'platformUserId' : null
    ].filter(Boolean).join(', ');
    console.error(`${logContext} Missing required parameters for API authenticated request to ${fullUrl}: ${missing}.`);
    return {
      success: false,
      error: `Internal error: Missing required parameter(s) for API authenticated service request: ${missing}`
    };
  }

  const config: AxiosRequestConfig = {
    method,
    url: fullUrl,
    headers: {
      'x-platform-client-user-id': platformClientUserId,
      'x-platform-user-id': platformUserId,
    },
  };

  return _makeServiceRequest<T>(fullUrl, config, logContext);
}

/**
 * Makes an ANONYMOUS HTTP request to another microservice endpoint.
 * Does NOT include authentication headers.
 * 
 * @param serviceUrl - Base URL of the target service.
 * @param method - HTTP method.
 * @param endpoint - API endpoint path.
 * @param data - Optional request body.
 * @param params - Optional URL query parameters.
 * @returns Promise<ServiceResponse<T>>.
 * @template T - Expected data payload type.
 */
export async function makeWebAnonymousServiceRequest<T>(
  serviceUrl: string,
  method: Method,
  endpoint: string,
  data?: any,
  params?: any
): Promise<ServiceResponse<T>> {
  const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${serviceUrl}${formattedEndpoint}`;
  const logContext = '[httpClient:Anon]';

  const config: AxiosRequestConfig = {
    method,
    url: fullUrl,
    params,
    headers: {}, // No auth headers
    data
  };

  return _makeServiceRequest<T>(fullUrl, config, logContext);
}