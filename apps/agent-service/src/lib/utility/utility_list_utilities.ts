/**
 * Utility List Utilities
 * 
 * A tool that calls the utility service API to get a list of available utilities.
 * Follows Vercel AI SDK tool format for Claude integration.
 */

// @ts-ignore - Tool import from ai package
import { tool } from 'ai';
import { z } from 'zod';
import axios from 'axios';

// API Gateway URL from environment variables with fallback
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:3002';

/**
 * Creates the list utilities tool with the given credentials
 */
export function createListUtilitiesTool(credentials: { 
  userId: string;
  conversationId: string;
  apiKey: string;
}) {
  const { userId, conversationId, apiKey } = credentials;
  
  return tool({
    name: 'utility_list_utilities',
    description: 'Get a list of all available utilities, optionally filtered by category.',
    parameters: z.object({
      category: z.string().optional().describe('Optional category to filter utilities by'),
      search: z.string().optional().describe('Optional search term to filter utilities by name or description')
    }),
    execute: async ({ category, search }) => {
      try {
        console.log(`[Utility Tool] Listing utilities with filters: ${category || 'none'}, ${search || 'none'}`);
        
        // Build query parameters
        const params: Record<string, string> = {
          user_id: userId,
          conversation_id: conversationId
        };
        
        if (category) params.category = category;
        if (search) params.search = search;
        
        const response = await axios.get(`${API_GATEWAY_URL}/utility-tool/get-list`, {
          params,
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
          }
        });
        
        if (response.data && Array.isArray(response.data)) {
          const formattedUtilities = response.data.map((util: any) => ({
            id: util.id,
            name: util.name,
            description: util.description,
            category: util.category
          }));
          
          return JSON.stringify(formattedUtilities, null, 2);
        }
        
        return 'Error: Invalid response from API Gateway';
      } catch (error) {
        console.error('[Utility Tool] Error listing utilities:', error);
        return handleAxiosError(error);
      }
    }
  });
}

/**
 * Helper function to handle Axios errors
 */
function handleAxiosError(error: any): string {
  if (axios.isAxiosError(error)) {
    // Handle network errors or API errors
    if (!error.response) {
      return `Network error: Failed to connect to API Gateway at ${API_GATEWAY_URL}`;
    }
    
    return `API Gateway error: ${error.response.status} - ${error.response.data?.error || error.message}`;
  }
  
  // Generic error
  return `Error: ${error instanceof Error ? error.message : String(error)}`;
} 