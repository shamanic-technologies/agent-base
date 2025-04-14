/**
 * HTTP client utility for service-to-service communication
 */
import axios, { AxiosRequestConfig, Method } from 'axios';
import { ServiceResponse } from '../types/common.js';

/**
 * Make an HTTP request to a service endpoint
 * Provides consistent error handling and response formatting
 * 
 * @param serviceUrl Base URL of the service
 * @param method HTTP method
 * @param endpoint API endpoint path
 * @param userId Optional user ID for authentication
 * @param data Optional request body
 * @param params Optional query parameters
 * @returns ServiceResponse with typed data payload
 */
export async function makeServiceRequest<T>(
  serviceUrl: string,
  method: Method,
  endpoint: string,
  userId?: string,
  data?: any,
  params?: any
): Promise<ServiceResponse<T>> {
  try {
    const config: AxiosRequestConfig = {
      method,
      url: `${serviceUrl}${endpoint}`,
      params
    };
    
    if (data) {
      config.data = data;
    }
    
    if (userId) {
      config.headers = { 'x-user-id': userId };
    }
    
    const response = await axios.request<ServiceResponse<T>>(config);
    return response.data;
  } catch (error) {
    console.error('Service request error:', error);
    if (axios.isAxiosError(error)) {
      const specificError = error.response?.data?.error;
      return {
        success: false,
        error: specificError || `Service communication error (Status: ${error.response?.status || 'unknown'})`
      };
    }
    return { 
      success: false, 
      error: 'Internal error in service request' 
    };
  }
} 