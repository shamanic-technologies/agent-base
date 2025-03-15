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
 * Makes a streaming request to the Agent Base through our secure server API
 * @param endpoint The Agent Base endpoint path
 * @param data Request body for the streaming POST request
 * @param onChunk Callback function to handle each received chunk
 * @param onDone Callback function called when streaming is complete
 * @param onError Callback function for error handling
 */
export function streamAgentBase(
  endpoint: string,
  data: any,
  onChunk: (chunk: any) => void,
  onDone?: () => void,
  onError?: (error: Error) => void
): () => void {
  try {
    // Create EventSource for streaming endpoint
    const eventSource = new EventSource('/api/proxy/stream?' + new URLSearchParams({
      endpoint,
      data: JSON.stringify(data)
    }).toString());
    
    // Handle incoming messages
    eventSource.onmessage = (event) => {
      if (event.data === '[DONE]') {
        eventSource.close();
        onDone && onDone();
        return;
      }
      
      try {
        const chunk = JSON.parse(event.data);
        onChunk(chunk);
      } catch (err) {
        console.warn('Error parsing streaming chunk:', err);
        onChunk({ type: 'parse_error', data: event.data });
      }
    };
    
    // Handle errors
    eventSource.onerror = (error) => {
      console.error(`Streaming error from ${endpoint}:`, error);
      eventSource.close();
      onError && onError(new Error('Stream connection error'));
    };
    
    // Return a function to close the stream
    return () => {
      eventSource.close();
    };
  } catch (error: any) {
    console.error(`Error setting up stream to ${endpoint}:`, error);
    onError && onError(error);
    return () => {}; // Return no-op cleanup function
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