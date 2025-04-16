/**
 * HTTP client utility for service-to-service communication
 */
import axios, { AxiosRequestConfig, Method } from 'axios';
import { ServiceResponse } from '@agent-base/types';

/**
 * Makes an AUTHENTICATED HTTP request to another microservice endpoint.
 * Includes the x-platform-user-id header.
 * 
 * @param {string} serviceUrl - The base URL of the target service (e.g., 'http://localhost:3001').
 * @param {Method} method - The HTTP method (e.g., 'GET', 'POST').
 * @param {string} endpoint - The specific API endpoint path (e.g., '/users/profile').
 * @param {string} platformUserId - Platform user ID to propagate in the 'x-platform-user-id' header. MUST be provided.
 * @param {any} [data] - Optional request body data (typically for POST, PUT, PATCH).
 * @param {any} [params] - Optional URL query parameters.
 * @returns {Promise<ServiceResponse<T>>} - A promise resolving to a standard ServiceResponse object.
 * @template T - The expected type of the data payload within the ServiceResponse on success.
 */
export async function makeAuthenticatedServiceRequest<T>(
  serviceUrl: string,
  method: Method,
  endpoint: string,
  platformUserId: string, // Required for authenticated requests
  data?: any,
  params?: any
): Promise<ServiceResponse<T>> {
  const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${serviceUrl}${formattedEndpoint}`;

  if (!platformUserId) {
    // Enforce platformUserId for authenticated requests
    console.error(`[httpClient:Auth] platformUserId is required for authenticated request to ${fullUrl}.`);
    return {
      success: false,
      error: 'Internal error: platformUserId missing for authenticated service request'
    };
  }

  try {
    const config: AxiosRequestConfig = {
      method,
      url: fullUrl,
      params,
      headers: {
        'x-platform-user-id': platformUserId // Always add the header
      }
    };
    
    if (data) {
      config.data = data;
    }
        
    console.log(`[httpClient:Auth] Making ${method} request to ${fullUrl} for user ${platformUserId}`);

    const response = await axios.request<ServiceResponse<T>>(config);

    if (typeof response.data === 'object' && response.data !== null && 'success' in response.data) {
       console.log(`[httpClient:Auth] Received successful standard response from ${fullUrl}`);
       return response.data;
    } else {
       console.warn(`[httpClient:Auth] Received non-standard success response from ${fullUrl}. Wrapping data.`);
       return { success: true, data: response.data as T };
    }

  } catch (error) {
    console.error(`[httpClient:Auth] Service request error to ${fullUrl} for user ${platformUserId}:`, error);
    
    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 'unknown';
      const responseData = error.response?.data;
      console.error(`[httpClient:Auth] Axios error details: Status=${status}, Response=${JSON.stringify(responseData)}`);
      
      const specificError = responseData?.error || error.message;
      
      return {
        success: false,
        error: specificError || `Service communication error (Status: ${status})`
      };
    } else {
      console.error(`[httpClient:Auth] Non-Axios error during request to ${fullUrl}: ${error}`);
      return { 
        success: false, 
        error: 'Internal error during service request execution' 
      };
    }
  }
} 

/**
 * Makes an ANONYMOUS HTTP request to another microservice endpoint.
 * Does NOT include the x-platform-user-id header.
 * 
 * @param {string} serviceUrl - The base URL of the target service.
 * @param {Method} method - The HTTP method.
 * @param {string} endpoint - The specific API endpoint path.
 * @param {any} [data] - Optional request body data.
 * @param {any} [params] - Optional URL query parameters.
 * @returns {Promise<ServiceResponse<T>>} - A promise resolving to a standard ServiceResponse object.
 * @template T - The expected type of the data payload within the ServiceResponse on success.
 */
export async function makeAnonymousServiceRequest<T>(
  serviceUrl: string,
  method: Method,
  endpoint: string,
  data?: any,
  params?: any
): Promise<ServiceResponse<T>> {
  const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${serviceUrl}${formattedEndpoint}`;

  try {
    const config: AxiosRequestConfig = {
      method,
      url: fullUrl,
      params,
      headers: {} // No platformUserId header
    };
    
    if (data) {
      config.data = data;
    }
        
    console.log(`[httpClient:Anon] Making ${method} request to ${fullUrl}`);

    const response = await axios.request<ServiceResponse<T>>(config);

    if (typeof response.data === 'object' && response.data !== null && 'success' in response.data) {
       console.log(`[httpClient:Anon] Received successful standard response from ${fullUrl}`);
       return response.data;
    } else {
       console.warn(`[httpClient:Anon] Received non-standard success response from ${fullUrl}. Wrapping data.`);
       return { success: true, data: response.data as T };
    }

  } catch (error) {
    console.error(`[httpClient:Anon] Service request error to ${fullUrl}:`, error);
    
    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 'unknown';
      const responseData = error.response?.data;
      console.error(`[httpClient:Anon] Axios error details: Status=${status}, Response=${JSON.stringify(responseData)}`);
      
      const specificError = responseData?.error || error.message;
      
      return {
        success: false,
        error: specificError || `Service communication error (Status: ${status})`
      };
    } else {
      console.error(`[httpClient:Anon] Non-Axios error during request to ${fullUrl}: ${error}`);
      return { 
        success: false, 
        error: 'Internal error during service request execution' 
      };
    }
  }
} 