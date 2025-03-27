/**
 * Utility Call Utility
 * 
 * A tool that calls any other utility function by its ID through the utility service.
 * Follows Vercel AI SDK tool format for Claude integration.
 */

// @ts-ignore - Tool import from ai package
import { tool } from 'ai';
import { z } from "zod";
import axios from 'axios';

// API Gateway URL from environment variables with fallback
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:3002';

/**
 * Creates the call utility tool with the given credentials
 */
export function createCallUtilityTool(credentials: { 
  userId: string;
  conversationId: string;
  apiKey: string;
}) {
  const { userId, conversationId, apiKey } = credentials;
  
  return tool({
    name: 'utility_call_utility',
    description: 'Execute a specific utility function by its ID.',
    parameters: z.object({
      utility_id: z.string().describe('The ID of the utility to call'),
      input: z.any().describe('The input data to pass to the utility')
    }),
    execute: async ({ utility_id, input }) => {
      try {
        console.log(`[Utility Tool] Calling utility ${utility_id} with input:`, input);
        
        if (!utility_id) {
          return 'Error: utility_id is required';
        }
        
        const response = await axios.post(
          `${API_GATEWAY_URL}/utility-tool/call-tool/${utility_id}`, 
          {
            input_data: input
          },
          {
            params: {
              user_id: userId,
              conversation_id: conversationId
            },
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey
            }
          }
        );
        
        if (response.data) {
          return typeof response.data === 'object'
            ? JSON.stringify(response.data, null, 2)
            : String(response.data);
        }
        
        return 'Error: Invalid response from API Gateway';
      } catch (error) {
        console.error(`[Utility Tool] Error calling utility ${utility_id}:`, error);
        return handleErrorWithStatus(error, utility_id);
      }
    }
  });
}

/**
 * Helper function to handle errors with specific status codes
 */
function handleErrorWithStatus(error: any, utilityId?: string): string {
  if (axios.isAxiosError(error)) {
    // Handle network errors or API errors
    if (!error.response) {
      return `Network error: Failed to connect to API Gateway at ${API_GATEWAY_URL}`;
    }
    
    // Handle common error codes
    if (error.response.status === 404) {
      return `Utility not found: ${utilityId}`;
    }
    
    if (error.response.status === 400) {
      return `Bad request: ${error.response.data?.error || 'Invalid input data for this utility'}`;
    }
    
    return `API Gateway error: ${error.response.status} - ${error.response.data?.error || error.message}`;
  }
  
  // Generic error
  return `Error: ${error instanceof Error ? error.message : String(error)}`;
} 