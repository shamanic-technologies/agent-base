/**
 * Utility Get Utility Info
 * 
 * A tool that calls the utility service API via the API Gateway to get information about a specific utility.
 * Uses the dedicated api-gateway-client.
 * Follows Vercel AI SDK tool format for Claude integration.
 */

// @ts-ignore - Tool import from ai package
import { tool, Tool } from 'ai';
import { z } from 'zod';
// Use local types for agent-service specific structures
import { UtilityError } from '../../types/index.js';
// Import shared types and the specific gateway client function
import { ServiceResponse, UtilityInfo, UtilityToolCredentials, AgentServiceCredentials } from '@agent-base/types';
import { getUtilityInfoFromAgent } from '@agent-base/api-client'; // Use the dedicated gateway client

/**
 * Creates the get utility info tool with the given credentials
 */
export function createGetUtilityInfoTool(credentials: AgentServiceCredentials) : Tool {
  // Pass the whole credentials object to the client
  
  return tool({
    name: 'utility_get_utility_info',
    description: 'Get detailed information about a specific utility.',
    parameters: z.object({
      utilityId: z.string().describe('The ID of the utility to get information about')
    }),
    execute: async ({ utilityId }) : Promise<UtilityInfo | UtilityError> => {
      try {
        console.log(`[Utility Tool] Getting info for utility ${utilityId} via API Gateway client`);
        
        if (!utilityId) {
          return {
            error: true,
            message: 'utilityId is required',
            status: 'error',
            code: 'MISSING_PARAMETER'
          } as UtilityError;
        }

        // Call the API Gateway using the dedicated client
        // The client now uses makeAPIServiceRequest which handles standard errors
        const getResponse : ServiceResponse<UtilityInfo> = await getUtilityInfoFromAgent(credentials, utilityId);
        
        // Check the ServiceResponse from the client
        if (!getResponse.success) {
          return {
            error: true,
            message: getResponse.error || 'Failed to get utility info.',
            details: getResponse.details,
            status: 'error',
            code: 'GET_INFO_FAILED' // Default error code
          } as UtilityError;
        }
        return getResponse.data; // Return the actual UtilityInfo data
        
      } catch (error) {
        return {
            error: true,
            message: error instanceof Error ? error.message : 'An unexpected error occurred',
            details: String(error),
            status: 'error',
            code: 'UNEXPECTED_ERROR'
        } as UtilityError;
      }
    }
  });
} 