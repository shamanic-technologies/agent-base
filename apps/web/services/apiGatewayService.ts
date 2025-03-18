/**
 * API Gateway Service API
 * 
 * Handles interactions with the HelloWorld API Gateway Service
 */

// API Gateway service URL from environment variables
const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL;

/**
 * Send a message to the AI model via the API gateway service
 * 
 * @param prompt - The message to send to the AI
 * @param apiKey - The API key for authentication
 * @param threadId - Optional thread ID for conversation context
 * @returns The AI response
 */
export async function sendMessage(prompt: string, apiKey: string, threadId?: string): Promise<any> {
  try {
    const response = await fetch(`${API_GATEWAY_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({ 
        prompt,
        conversation_id: threadId 
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get response from AI');
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending message to API gateway service:', error);
    throw error;
  }
}

/**
 * Check if the API gateway service is healthy
 * 
 * @returns Health status of the API gateway service
 */
export async function checkHealth(): Promise<{ status: string, services: Record<string, string> }> {
  try {
    const response = await fetch(`${API_GATEWAY_URL}/health`);
    
    if (!response.ok) {
      throw new Error('API gateway service health check failed');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error checking API gateway service health:', error);
    throw error;
  }
} 