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
import { UtilityError } from '../../types/index.js';

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
      parameters: z.record(z.any()).optional().describe('The parameters to pass to the utility')
    }),
    execute: async ({ utility_id, parameters }) => {
      try {
        console.log(`[Utility Tool] Calling utility ${utility_id} with parameters:`, parameters);
        
        if (!utility_id) {
          return {
            error: true,
            message: 'utility_id is required',
            status: 'error',
            code: 'MISSING_PARAMETER'
          } as UtilityError;
        }
        
        const response = await axios.post(
          `${API_GATEWAY_URL}/utility-tool/call-tool/${utility_id}`, 
          {
            input: parameters || {},
            conversation_id: conversationId,
            user_id: userId
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey
            }
          }
        );
        
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
        console.error(`[Utility Tool] Error calling utility ${utility_id}:`, error);
        return handleErrorWithStatus(error, utility_id);
      }
    }
  });
}

/**
 * Helper function to handle errors with specific status codes
 */
function handleErrorWithStatus(error: any, utilityId?: string): UtilityError {
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
    
    // Handle common error codes
    if (error.response.status === 404) {
      return {
        error: true,
        message: `Utility not found: ${utilityId}`,
        status: 'error',
        code: 'NOT_FOUND',
        statusCode: 404
      };
    }
    
    if (error.response.status === 400) {
      return {
        error: true,
        message: error.response.data?.error || 'Invalid input data for this utility',
        status: 'error',
        code: 'BAD_REQUEST',
        statusCode: 400
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