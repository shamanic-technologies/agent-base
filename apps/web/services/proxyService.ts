/**
 * Proxy Service API
 * 
 * Handles interactions with the HelloWorld Proxy Service
 */

// Proxy service URL (should be moved to environment variables in production)
const PROXY_SERVICE_URL = 'http://localhost:3002';

/**
 * Send a message to the AI model via the proxy service
 * 
 * @param prompt - The message to send to the AI
 * @param apiKey - The API key for authentication
 * @returns The AI response
 */
export async function sendMessage(prompt: string, apiKey: string): Promise<any> {
  try {
    const response = await fetch(`${PROXY_SERVICE_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get response from AI');
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending message to proxy service:', error);
    throw error;
  }
}

/**
 * Check if the proxy service is healthy
 * 
 * @returns Health status of the proxy service
 */
export async function checkHealth(): Promise<{ status: string, services: Record<string, string> }> {
  try {
    const response = await fetch(`${PROXY_SERVICE_URL}/health`);
    
    if (!response.ok) {
      throw new Error('Proxy service health check failed');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error checking proxy service health:', error);
    throw error;
  }
} 