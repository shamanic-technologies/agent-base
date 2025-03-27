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
import { UtilityError } from '../../types/index.js';

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
          return {
            error: true,
            message: 'utility_id is required',
            status: 'error',
            code: 'MISSING_PARAMETER'
          } as UtilityError;
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
          return response.data;
        }
        
        return {
          error: true,
          message: 'Invalid response from API Gateway',
          status: 'error',
          code: 'INVALID_RESPONSE'
        } as UtilityError;
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
function handleAxiosError(error: any, utilityId?: string): UtilityError {
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
    
    // Handle 404 separately if utilityId is provided
    if (utilityId && error.response.status === 404) {
      return {
        error: true,
        message: `Utility not found: ${utilityId}`,
        status: 'error',
        code: 'NOT_FOUND',
        statusCode: 404
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