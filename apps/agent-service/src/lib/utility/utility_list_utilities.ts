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
import { UtilityError } from '../../types/index.js';

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
        
        if (response.data && response.data.utilities && Array.isArray(response.data.utilities)) {
          const formattedUtilities = response.data.utilities.map((util: any) => ({
            id: util.id,
            name: util.name || util.id,
            description: util.description,
            category: util.category || 'general'
          }));
          
          return formattedUtilities;
        }
        
        return {
          error: true,
          message: 'Invalid response from API Gateway',
          status: 'error',
          code: 'INVALID_RESPONSE'
        } as UtilityError;
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
function handleAxiosError(error: any): UtilityError {
  if (axios.isAxiosError(error)) {
    // Handle network errors or API errors
    if (!error.response) {
      return {
        error: true,
        message: `Network error: Failed to connect to API Gateway at ${API_GATEWAY_URL}`,
        status: 'error',
        code: 'NETWORK_ERROR'
      };
    }
    
    return {
      error: true,
      message: error.response.data?.error || error.message,
      status: 'error',
      code: 'API_ERROR',
      statusCode: error.response.status
    };
  }
  
  // Generic error
  return {
    error: true,
    message: error instanceof Error ? error.message : String(error),
    status: 'error',
    code: 'UNKNOWN_ERROR'
  };
} 