/**
 * HTTP client utility for service-to-service communication
 */
import axios, { AxiosRequestConfig, Method } from 'axios';
import { ServiceResponse } from '../types/common.js';

/**
 * Makes an HTTP request to another microservice endpoint.
 * Handles standard request configuration, header propagation, and error formatting.
 * 
 * @param {string} serviceUrl - The base URL of the target service (e.g., 'http://localhost:3001').
 * @param {Method} method - The HTTP method (e.g., 'GET', 'POST').
 * @param {string} endpoint - The specific API endpoint path (e.g., '/users/profile').
 * @param {string} platformUserId - Platform user ID to propagate in the 'x-platform-user-id' header.
 * @param {any} [data] - Optional request body data (typically for POST, PUT, PATCH).
 * @param {any} [params] - Optional URL query parameters.
 * @returns {Promise<ServiceResponse<T>>} - A promise resolving to a standard ServiceResponse object.
 * @template T - The expected type of the data payload within the ServiceResponse on success.
 */
export async function makeServiceRequest<T>(
  serviceUrl: string,
  method: Method,
  endpoint: string,
  platformUserId: string,
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
      headers: {}
    };
    
    if (data) {
      config.data = data;
    }
    
    if (config.headers && platformUserId) {
      config.headers['x-platform-user-id'] = platformUserId;
    } else if (!platformUserId) {
       console.warn(`[httpClient] platformUserId is missing for request to ${fullUrl}. This might be required.`);
    }
    
    console.log(`[httpClient] Making ${method} request to ${fullUrl}${platformUserId ? ' for user ' + platformUserId : ''}`);

    const response = await axios.request<ServiceResponse<T>>(config);

    if (typeof response.data === 'object' && response.data !== null && 'success' in response.data) {
       console.log(`[httpClient] Received successful standard response from ${fullUrl}`);
       return response.data;
    } else {
       console.warn(`[httpClient] Received non-standard success response from ${fullUrl}. Wrapping data.`);
       return { success: true, data: response.data as T };
    }

  } catch (error) {
    console.error(`[httpClient] Service request error to ${fullUrl}:`, error);
    
    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 'unknown';
      const responseData = error.response?.data;
      console.error(`[httpClient] Axios error details: Status=${status}, Response=${JSON.stringify(responseData)}`);
      
      const specificError = responseData?.error || error.message;
      
      return {
        success: false,
        error: specificError || `Service communication error (Status: ${status})`
      };
    } else {
      console.error(`[httpClient] Non-Axios error during request to ${fullUrl}: ${error}`);
      return { 
        success: false, 
        error: 'Internal error during service request execution' 
      };
    }
  }
} 