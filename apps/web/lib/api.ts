/**
 * API utilities for communicating with the proxy-service
 */

// Default proxy-service URL from environment variables
const AGENT_BASE_URL = process.env.NEXT_PUBLIC_AGENT_BASE_URL;

/**
 * Makes a server-side authenticated request to the proxy-service
 * This should only be called from server-side code (Server Components, Route Handlers, Server Actions)
 * @param endpoint The API endpoint path
 * @param method HTTP method (GET, POST, etc.)
 * @param body Optional request body for POST/PUT requests
 * @returns The response data
 */
export async function callServerProxyApi(
  endpoint: string, 
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any
): Promise<any> {
  // This key is only available on the server
  const API_KEY = process.env.AGENT_BASE_API_KEY;
  
  if (!API_KEY) {
    throw new Error('API key not found in environment variables');
  }
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY
  };
  
  const options: RequestInit = {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  };
  
  try {
    const response = await fetch(`${AGENT_BASE_URL}${endpoint}`, options);
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error calling ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Tests the connection to the proxy-service
 * @returns A boolean indicating whether the connection was successful
 */
export async function testProxyConnection(): Promise<boolean> {
  try {
    const result = await callServerProxyApi('/api/proxy-mode');
    return !!result.success;
  } catch (error) {
    console.error('Failed to connect to proxy-service:', error);
    return false;
  }
} 