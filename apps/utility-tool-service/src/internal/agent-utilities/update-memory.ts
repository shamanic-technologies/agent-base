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
  Agent, // Assuming the SDK returns the updated AgentRecord
} from '@agent-base/types';
// Use package import now that agent-client.js is exported from @agent-base/api-client
import { updateAgentMemoryApiClient } from '@agent-base/api-client';
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
      agent_id: {
        type: 'string',
        description: 'REQUIRED. The ID of the agent whose memory is to be updated.',
      },
      memory_content: {
        type: 'string',
        description: 'REQUIRED. The new memory content for the agent. Provide an empty string to clear the memory.',
      },
    },
    required: ['agent_id', 'memory_content'],
    examples: [
      {
        agent_id: 'agent_01ht9jwbe2a3q7b4c6d8e0f2g1',
        memory_content: 'User prefers direct answers. Last topic discussed: project timelines.',
      },
      {
        agent_id: 'agent_01ht9jwbe2a3q7b4c6d8e0f2g1',
        memory_content: '', // Example of clearing memory
      }
    ]
  },

  execute: async (
    clientUserId: string,
    platformUserId: string,
    platformApiKey: string,
    _conversationId: string, // Not directly used by the updateAgentMemoryApiClient call
    params: { agent_id: string; memory_content: string },
    _executingAgentId?: string // Not directly used by the updateAgentMemoryApiClient call
  ): Promise<ServiceResponse<Agent>> => {
    const logPrefix = '🧠 [UPDATE_AGENT_MEMORY_UTILITY]';
    try {
      const { agent_id, memory_content } = params;

      // Validate authentication details passed to the utility execute function
      if (!clientUserId || !platformUserId || !platformApiKey) {
        console.error(`${logPrefix} Authentication details (clientUserId, platformUserId, platformApiKey) are missing.`);
        return {
          success: false,
          error: 'Internal Error: Authentication details are required to execute this utility.',
        };
      }

      // Validate required parameters from the 'params' object
      if (!agent_id) {
        console.error(`${logPrefix} 'agent_id' parameter is missing.`);
        return { success: false, error: "Invalid input: 'agent_id' parameter is missing." };
      }
      if (typeof agent_id !== 'string') {
        console.error(`${logPrefix} 'agent_id' parameter must be a string.`);
        return { success: false, error: "Invalid input: 'agent_id' must be a string." };
      }

      if (typeof memory_content === 'undefined') {
        console.error(`${logPrefix} 'memory_content' parameter is missing.`);
        return { success: false, error: "Invalid input: 'memory_content' parameter is missing." };
      }
      if (typeof memory_content !== 'string') {
        console.error(`${logPrefix} 'memory_content' parameter must be a string.`);
        return { success: false, error: "Invalid input: 'memory_content' must be a string." };
      }

      console.log(`${logPrefix} Attempting to update memory for agent ${agent_id} for client user ${clientUserId}.`);

      // Call the SDK function with the validated parameters
      const resultResponse: ServiceResponse<Agent> = await updateAgentMemoryApiClient(
        agent_id,
        memory_content,
        platformUserId,
        platformApiKey,
        clientUserId
      );

      if (!resultResponse.success) {
        console.error(`${logPrefix} Failed to update agent memory via API client:`, resultResponse.error, resultResponse.details);
        // Return the error response from the API client directly
        return resultResponse;
      }

      console.log(`${logPrefix} Successfully updated memory for agent ${agent_id}.`);
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