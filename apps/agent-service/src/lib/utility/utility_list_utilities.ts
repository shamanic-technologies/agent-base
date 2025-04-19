/**
 * Utility List Utilities
 * 
 * A tool that calls the utility service API via the API Gateway to get a list of available utilities.
 * Uses the dedicated api-gateway-client.
 * Follows Vercel AI SDK tool format for Claude integration.
 */

// @ts-ignore - Tool import from ai package
import { tool, Tool } from 'ai';
import { z } from 'zod';
// Use local types for agent-service specific structures
import { UtilityError } from '../../types/index.js';
// Import shared types and the specific gateway client function
import { ServiceResponse, UtilitiesList, AgentServiceCredentials, ListUtilities } from '@agent-base/types';
import { listUtilitiesFromAgent } from '@agent-base/api-client'; // Use the dedicated gateway client


/**
 * Creates the list utilities tool with the given credentials
 */
export function createListUtilitiesTool(credentials: AgentServiceCredentials) : Tool {
  // Pass the whole credentials object to the client
  
  return tool({
    name: 'utility_list_utilities',
    description: 'Get a list of all available utilities.',
    parameters: z.object({}),
    execute: async () : Promise<ListUtilities | UtilityError> => {
      try {
        console.log(`[Utility Tool] Listing utilities via API Gateway client`);
        

        // Call the API Gateway using the dedicated client
        // The client now uses makeAPIServiceRequest which handles standard errors
        const listResponse : ServiceResponse<ListUtilities> = await listUtilitiesFromAgent(credentials);
        
        // Check the ServiceResponse from the client
        if (!listResponse.success) {
          return {
            error: true,
            message: listResponse.error || 'Failed to list utilities.',
            details: listResponse.details,
            status: 'error',
            code: 'LIST_FAILED' // Default error code
          } as UtilityError;
        }

        return listResponse.data;
 

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