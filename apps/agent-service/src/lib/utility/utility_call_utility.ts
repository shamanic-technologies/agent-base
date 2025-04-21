/**
 * Utility Call Utility
 * 
 * A tool that calls any other utility function by its ID through the utility service via the API Gateway.
 * Uses the dedicated api-gateway-client.
 * Follows Vercel AI SDK tool format for Claude integration.
 */

// @ts-ignore - Tool import from ai package
import { tool, Tool } from 'ai';
import { z } from "zod";
// Use local types for agent-service specific structures
import { UtilityError } from '../../types/index.js';
// Import shared types and the specific gateway client function
import { AgentServiceCredentials, ExecuteToolResult, ServiceResponse, UtilityToolCredentials } from '@agent-base/types'; 
import { callUtilityFromAgent } from '@agent-base/api-client'; // Use the dedicated gateway client

/**
 * Creates the call utility tool with the given credentials
 */
export function createCallUtilityTool(utilityToolCredentials: UtilityToolCredentials) : Tool {
  // Pass the whole credentials object to the client
  const { clientUserId, platformUserId, platformApiKey, agentId } = utilityToolCredentials;
  return tool({
    name: 'utility_call_utility',
    description: 'Execute a specific utility function by its ID.',
    parameters: z.object({
      utilityId: z.string().describe('The ID of the utility to call'),
      parameters: z.record(z.any()).optional().describe('The parameters to pass to the utility')
    }),
    execute: async ({ utilityId, parameters }) : Promise<ExecuteToolResult | UtilityError> => {
      try {
        console.log(`[Utility Tool] Calling utility ${utilityId} via API Gateway client`);
        
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
        const resultResponse : ServiceResponse<ExecuteToolResult> = await callUtilityFromAgent(utilityToolCredentials, utilityId, parameters);
        
        // Check the ServiceResponse from the client
        if (!resultResponse.success) {
            console.error(`[Utility Tool] Gateway client reported failure for ${utilityId}: ${resultResponse.error}`, resultResponse.details);
            return {
              error: true,
              message: 'Error in calling utility',
              status: 'error',
              code: 'EXECUTION_FAILED'
            } as UtilityError;;
        }
        return resultResponse.data;

      } catch (error) {

        console.error(`[Utility Tool] Error during call utility ${utilityId} process:`, error);
        return {
          error: true,
          message: 'Unknown error during call utility process',
          status: 'error',
          code: 'EXECUTION_FAILED'
        } as UtilityError;
      }
    }
  });
} 