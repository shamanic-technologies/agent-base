/**
 * Utility Get Utility Info
 * 
 * A tool that calls the utility service API to get information about a specific utility.
 * Follows Vercel AI SDK tool format for Claude integration.
 */

// @ts-ignore - Tool import from ai package
import { tool } from 'ai';
import { z } from 'zod';
import axios from 'axios';

// API Gateway URL from environment variables with fallback
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:3002';

/**
 * Creates the get utility info tool with the given credentials
 */
export function createGetUtilityInfoTool(credentials: { 
  userId: string;
  conversationId: string;
  apiKey: string;
}) {
  const { userId, conversationId, apiKey } = credentials;
  
  return tool({
    name: 'utility_get_utility_info',
    description: 'Get detailed information about a specific utility.',
    parameters: z.object({
      utility_id: z.string().describe('The ID of the utility to get information about')
    }),
    execute: async ({ utility_id }) => {
      try {
        console.log(`[Utility Tool] Getting info for utility: ${utility_id}`);
        
        if (!utility_id) {
          return 'Error: utility_id is required';
        }
        
        const response = await axios.get(`${API_GATEWAY_URL}/utility-tool/get-details/${utility_id}`, {
          params: {
            user_id: userId,
            conversation_id: conversationId
          },
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
          }
        });
        
        if (response.data) {
          return JSON.stringify(response.data, null, 2);
        }
        
        return 'Error: Invalid response from API Gateway';
      } catch (error) {
        console.error(`[Utility Tool] Error getting info for utility ${utility_id}:`, error);
        return handleAxiosError(error, utility_id);
      }
    }
  });
}

/**
 * Helper function to handle Axios errors
 */
function handleAxiosError(error: any, utilityId?: string): string {
  if (axios.isAxiosError(error)) {
    // Handle network errors or API errors
    if (!error.response) {
      return `Network error: Failed to connect to API Gateway at ${API_GATEWAY_URL}`;
    }
    
    // Handle 404 separately if utilityId is provided
    if (utilityId && error.response.status === 404) {
      return `Utility not found: ${utilityId}`;
    }
    
    return `API Gateway error: ${error.response.status} - ${error.response.data?.error || error.message}`;
  }
  
  // Generic error
  return `Error: ${error instanceof Error ? error.message : String(error)}`;
} 