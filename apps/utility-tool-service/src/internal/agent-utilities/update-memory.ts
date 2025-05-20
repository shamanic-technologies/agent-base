/**
 * Internal Utility: Update Agent Memory
 * 
 * Provides an internal utility interface to update the memory of a specified agent
 * by calling the agent-service via the api-client.
 */
import {
  InternalUtilityTool,
  ServiceResponse,
  AgentRecord,
  Agent,
  UpdateClientUserAgentInput, // Assuming the SDK returns the updated AgentRecord
} from '@agent-base/types';
// Use package import now that agent-client.js is exported from @agent-base/api-client
import { updateAgentInternalService, updateAgentMemoryApiClient } from '@agent-base/api-client';
import { registry } from '../../registry/registry.js';

/**
 * Implementation of the Update Agent Memory utility
 */
const updateAgentMemoryUtility: InternalUtilityTool = {
  id: 'update_agent_memory',
  description: 'Updates the memory content for a specified agent. The memory content will overwrite any existing memory.',
  schema: {
    type: 'object',
    properties: {
      memory: {
        type: 'string',
        description: 'REQUIRED. The new memory content for the agent. Provide an empty string to clear the memory.',
      },
    },
    required: ['memory'],
    examples: [
      {
        memory: 'User prefers direct answers. Last topic discussed: project timelines.',
      },
      {
        memory: '', // Example of clearing memory
      }
    ]
  },

  execute: async (
    clientUserId: string,
    platformUserId: string,
    platformApiKey: string,
    conversationId: string,
    params: { memory: string },
    agentId?: string
  ): Promise<ServiceResponse<Agent>> => {
    const logPrefix = '🧠 [UPDATE_AGENT_MEMORY_UTILITY]';
    try {
      const { memory } = params;

      // Validate authentication details passed to the utility execute function
      if (!clientUserId || !platformUserId || !platformApiKey) {
        console.error(`${logPrefix} Authentication details (clientUserId, platformUserId, platformApiKey) are missing.`);
        return {
          success: false,
          error: 'Internal Error: Authentication details are required to execute this utility.',
        };
      }

      // Validate required parameters from the 'params' object

      if (typeof memory === 'undefined') {
        console.error(`${logPrefix} 'memory' parameter is missing.`);
        return { success: false, error: "Invalid input: 'memory' parameter is missing." };
      }
      if (typeof memory !== 'string') {
        console.error(`${logPrefix} 'memory' parameter must be a string.`);
        return { success: false, error: "Invalid input: 'memory' must be a string." };
      }

      const agentUpdateData: UpdateClientUserAgentInput = {
        clientUserId: clientUserId,
        agentId: agentId,
        agentMemory: memory
      };

      // Call the SDK function with the validated parameters
      const resultResponse: ServiceResponse<Agent> = await updateAgentInternalService(
        agentId,
        agentUpdateData,
        platformUserId,
        platformApiKey,
        clientUserId
      );

      if (!resultResponse.success) {
        console.error(`${logPrefix} Failed to update agent memory via API client:`, resultResponse.error, resultResponse.details);
        // Return the error response from the API client directly
        return resultResponse;
      }

      return resultResponse; // Contains { success: true, data: AgentRecord }

    } catch (error: any) {
      console.error(`${logPrefix} Unexpected error executing utility:`, error);
      return {
        success: false,
        error: 'Failed to execute update agent memory utility due to an unexpected error.',
        details: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

// Register the utility
registry.register(updateAgentMemoryUtility);

// Export for potential direct use or testing (optional)
// export default updateAgentMemoryUtility; 