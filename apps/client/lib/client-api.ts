/**
 * Client-side API utilities for communicating with the Agent Base
 * These functions use our secure server-side API route
 */

/**
 * Makes a client-side request to the Agent Base through our secure server API
 * @param endpoint The Agent Base endpoint path
 * @param method HTTP method (GET, POST, etc.)
 * @param data Optional request body for POST/PUT requests
 * @returns The response data
 */
export async function callAgentBase(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST',
  data?: any
): Promise<any> {
  try {
    // Call our own API route which securely handles the API key
    const response = await fetch('/api/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endpoint,
        method,
        data,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error calling Agent Base ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Tests the connection to the Agent Base
 * @returns Information about the connection status
 */
export async function testAgentBaseConnection(): Promise<{
  status: 'connected' | 'failed';
  message: string;
  result?: any;
  error?: string;
}> {
  try {
    const response = await fetch('/api/proxy');
    
    if (!response.ok) {
      throw new Error(`Connection test failed: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error: any) {
    console.error('Connection test error:', error);
    return {
      status: 'failed',
      message: 'Failed to connect to the Agent Base',
      error: error.message,
    };
  }
} 