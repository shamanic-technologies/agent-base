/**
 * HTTP client utility for service-to-service communication
 */
import axios, { AxiosRequestConfig, Method } from 'axios';
import { AgentBaseCredentials, MinimalInternalCredentials, ServiceResponse} from '@agent-base/types';

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
    const response = await axios.request<ServiceResponse<T>>(config);

    // --- TEMPORARY DEBUG LOG ---
    console.log(`${logContext} Raw response.data from ${fullUrl}:`, JSON.stringify(response.data));
    // --- END TEMPORARY DEBUG LOG ---

    // Check if the response looks like a standard ServiceResponse
    if (typeof response.data === 'object' && response.data !== null && 'success' in response.data) {
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
      
      console.log(`${logContext} Raw error response data received:`, JSON.stringify(responseData)); 
      
      const specificError = responseData?.error || error.message; // Prefers error field from body
      console.error(`${logContext} Axios error details: Status=${status}, Response=${JSON.stringify(responseData)}`);
      
      // Include details if they exist in the response data
      return {
        success: false,
        error: specificError || `Service communication error (Status: ${status})`,
        details: responseData?.details // Pass through the details array
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
 * @param platformOrganizationId - Required platform organization ID for 'x-platform-organization-id' header.
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
  platformOrganizationId: string, // Required
  data?: any,
  params?: any
): Promise<ServiceResponse<T>> {
  const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${serviceUrl}${formattedEndpoint}`;
  const logContext = `[httpClient:WebAuth] User ${platformUserId}, Org ${platformOrganizationId}`; 

  const config: AxiosRequestConfig = {
    method,
    url: fullUrl,
    params,
    headers: {
      'x-platform-user-id': platformUserId,
      'x-platform-organization-id': platformOrganizationId,
    },
    data
  };

  return _makeServiceRequest<T>(fullUrl, config, logContext);
} 



/**
 * Makes an API Authenticated HTTP request (clientAuthUserId, clientAuthOrganizationId, platformApiKey).
 * Includes x-client-auth-user-id, x-client-auth-organization-id and x-platform-api-key headers.
 * All three auth identifiers are required.
 * 
 * @param serviceUrl - Base URL of the target service.
 * @param method - HTTP method.
 * @param endpoint - API endpoint path.
 * @param agentBaseCredentials - Required client auth user ID, client auth organization ID and platform API key.
 * @param data - Optional request body.
 * @param params - Optional URL query parameters.
 * @returns Promise<ServiceResponse<T>>.
 * @template T - Expected data payload type.
 */
export async function makeAgentBaseRequest<T>(
  serviceUrl: string,
  method: Method,
  endpoint: string,
  agentBaseCredentials: AgentBaseCredentials,
  data?: any,
  params?: any
): Promise<ServiceResponse<T>> {
  const { clientAuthUserId, clientAuthOrganizationId, platformApiKey } = agentBaseCredentials;
  const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${serviceUrl}${formattedEndpoint}`;
  const logContext = `[httpClient:ApiAuth] PlatformClient ${clientAuthUserId}, Organization ${clientAuthOrganizationId}`;

  // Validate required parameters
  if (!clientAuthUserId || !clientAuthOrganizationId || !platformApiKey) {
    const missing = [
        !clientAuthUserId ? 'clientAuthUserId' : null,
        !clientAuthOrganizationId ? 'clientAuthOrganizationId' : null,
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
      'x-client-auth-user-id': clientAuthUserId,
      'x-client-auth-organization-id': clientAuthOrganizationId,
      'x-platform-api-key': platformApiKey,
    },
    data
  };

  return _makeServiceRequest<T>(fullUrl, config, logContext);
}

/**
 * Makes an API Authenticated HTTP request (clientUserId, clientOrganizationId, platformApiKey).
 * Includes x-client-user-id, x-client-organization-id and x-platform-api-key headers.
 * All three auth identifiers are required.
 * 
 * @param serviceUrl - Base URL of the target service.
 * @param method - HTTP method.
 * @param endpoint - API endpoint path.
 * @param minimalInternalCredentials - Required client user ID and platform API key.
 * @param data - Optional request body.
 * @param params - Optional URL query parameters.
 * @returns Promise<ServiceResponse<T>>.
 * @template T - Expected data payload type.
 */
export async function makeMinimalInternalRequest<T>(
  serviceUrl: string,
  method: Method,
  endpoint: string,
  minimalInternalCredentials: MinimalInternalCredentials,
  data?: any,
  params?: any
): Promise<ServiceResponse<T>> {
  const { platformApiKey, clientUserId, clientOrganizationId } = minimalInternalCredentials;
  const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${serviceUrl}${formattedEndpoint}`;
  const logContext = `[httpClient:ApiAuth] ClientUser ${clientUserId}`;

  // Validate required parameters
  if (!clientUserId || !platformApiKey || !clientOrganizationId) {
    const missing = [
        !clientUserId ? 'clientUserId' : null,
        !clientOrganizationId ? 'clientOrganizationId' : null,
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
      'x-client-user-id': clientUserId,
      'x-client-organization-id': clientOrganizationId,
      'x-platform-api-key': platformApiKey,
    },
    data
  };

  return _makeServiceRequest<T>(fullUrl, config, logContext);
}

/**
 * Makes an API Authenticated HTTP request (platformUserId, clientUserId, clientOrganizationId, platformApiKey).
 * Includes x-platform-user-id, x-client-user-id, x-client-organization-id and x-platform-api-key headers.
 * All four auth identifiers are required.
 * 
 * @param serviceUrl - Base URL of the target service.
 * @param method - HTTP method.
 * @param endpoint - API endpoint path.
 * @param platformUserId - Required platform user ID for 'x-platform-user-id' header.
 * @param clientUserId - Required client user ID for 'x-client-user-id' header.
 * @param clientOrganizationId - Required client organization ID for 'x-client-organization-id' header.
 * @param platformApiKey - Required platform API key for 'x-platform-api-key' header.
 * @param data - Optional request body.
 * @param params - Optional URL query parameters.
 * @param agentId - Optional agent ID for 'x-agent-id' header.
 * @returns Promise<ServiceResponse<T>>.
 * @template T - Expected data payload type.
 */
export async function makeInternalRequest<T>(
  serviceUrl: string,
  method: Method,
  endpoint: string,
  platformUserId: string, // Required
  clientUserId: string,   // Required
  clientOrganizationId: string,   // Required
  platformApiKey: string, // Required
  data?: any,
  params?: any,
  agentId?: string      // Optional agent ID
): Promise<ServiceResponse<T>> {
  const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${serviceUrl}${formattedEndpoint}`;
  const logContext = `[httpClient:ApiAuth] PlatformUser ${platformUserId}, ClientUser ${clientUserId}, ClientOrganization ${clientOrganizationId}${agentId ? ', Agent ' + agentId : ''}`;

  // Validate required parameters
  if (!platformUserId || !clientUserId || !clientOrganizationId || !platformApiKey) {
    const missing = [
        !platformUserId ? 'platformUserId' : null,
        !clientUserId ? 'clientUserId' : null,
        !clientOrganizationId ? 'clientOrganizationId' : null,
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
      'x-client-organization-id': clientOrganizationId,
      'x-platform-api-key': platformApiKey,
      ...(agentId && { 'x-agent-id': agentId }), // Conditionally add x-agent-id if provided
    },
    data
  };

  return _makeServiceRequest<T>(fullUrl, config, logContext);
}


/**
 * Makes an API Authenticated HTTP request (platformClientUserId, platformApiKey).
 * Includes x-platform-client-user-id and x-platform-api-key headers.
 * All two auth identifiers are required.
 * 
 * @param externalUrl - Base URL of the target service.
 * @param method - HTTP method.
 * @param endpoint - API endpoint path.
 * @param platformUserApiServiceCredentials - Required platform client user ID and platform API key.
 * @param data - Optional request body.
 * @param params - Optional URL query parameters.
 * @param customHeaders - Optional custom headers to include in the request.
 * @returns Promise<ServiceResponse<T>>.
 * @template T - Expected data payload type.
 */
export async function makeExternalApiServiceRequest<T>(
  externalUrl: string,
  method: Method,
  endpoint: string,
  data?: any,
  params?: any,
  customHeaders?: Record<string, string> // Add optional customHeaders argument
): Promise<ServiceResponse<T>> {
  const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${externalUrl}${formattedEndpoint}`;
  const logContext = `[httpClient:ApiAuth] ExternalApi`;

  const config: AxiosRequestConfig = {
    method,
    url: fullUrl,
    params,
    headers: { ...customHeaders }, // Spread customHeaders here
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
 * @param platformApiKey - Required platform API key for 'x-platform-api-key' header.
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
  const logContext = `[httpClient:ApiAuth] PlatformApiKey validation for key starting with ${platformApiKey ? platformApiKey.substring(0, 5) : 'N/A'}`;

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
    data: {}
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
export async function makeClientAuthValidationRequest<T>(
  serviceUrl: string,
  method: Method,
  endpoint: string,
  clientAuthUserId: string, // Required
  clientAuthOrganizationId: string, // Required
  platformUserId: string, // Required
): Promise<ServiceResponse<T>> {
  const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${serviceUrl}${formattedEndpoint}`;
  const logContext = `[httpClient:ApiAuth] ClientAuth ${clientAuthUserId}, Organization ${clientAuthOrganizationId}`;

  // Validate required parameters
  if (!clientAuthUserId || !clientAuthOrganizationId || !platformUserId) {
    const missing = [
        !clientAuthUserId ? 'clientAuthUserId' : null,
        !clientAuthOrganizationId ? 'clientAuthOrganizationId' : null,
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
      'x-client-auth-user-id': clientAuthUserId,
      'x-client-auth-organization-id': clientAuthOrganizationId,
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
    headers: {
      'Content-Type': 'application/json', // Explicitly set Content-Type
    }, 
    data
  };

  return _makeServiceRequest<T>(fullUrl, config, logContext);
}