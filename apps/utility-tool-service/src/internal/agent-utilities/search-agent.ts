/**
 * Internal Utility: Search Agents
 * 
 * Provides an internal utility interface to search for agents based on a natural language query.
 * It calls the agent-service, which generates an embedding for the query and performs
 * a vector similarity search in the database.
 */
import {
  InternalUtilityTool,
  ServiceResponse,
  Agent,
} from '@agent-base/types';
import { searchAgentsInternalService } from '@agent-base/api-client';
import { registry } from '../../registry/registry.js';

/**
 * Implementation of the Search Agents utility
 */
const searchAgentsUtility: InternalUtilityTool = {
  id: 'search_agents',
  description: 'Searches for agents based on a natural language query describing their skills, role, or memory. Returns a list of the most relevant agents.',
  schema: {
    type: 'object',
    properties: {
      searchText: {
        type: 'string',
        description: "REQUIRED. The natural language query to search for. E.g., 'an expert in billing' or 'agent who knows about project timelines'.",
      },
      limit: {
        type: 'number',
        description: "OPTIONAL. The maximum number of agents to return. Defaults to 5.",
      },
    },
    required: ['searchText'],
    examples: [
      {
        searchText: 'specialist in database management',
      },
      {
        searchText: 'agent who handled the last support ticket for user XYZ',
        limit: 1,
      }
    ]
  },

  execute: async (
    clientUserId: string,
    clientOrganizationId: string,
    platformUserId: string,
    platformApiKey: string,
    conversationId: string,
    params: { searchText: string; limit?: number },
    agentId?: string
  ): Promise<ServiceResponse<Agent[]>> => {
    const logPrefix = '🔍 [SEARCH_AGENTS_UTILITY]';
    try {
      const { searchText, limit = 5 } = params;

      // Validate authentication details
      if (!clientUserId || !clientOrganizationId || !platformUserId || !platformApiKey) {
        console.error(`${logPrefix} Authentication details are missing.`);
        return {
          success: false,
          error: 'Internal Error: Authentication details are required to execute this utility.',
        };
      }
      
      // Call the SDK function
      const resultResponse = await searchAgentsInternalService(
        searchText,
        limit,
        platformUserId,
        platformApiKey,
        clientUserId,
        clientOrganizationId
      );

      if (!resultResponse.success) {
        console.error(`${logPrefix} Failed to search for agents via API client:`, resultResponse.error, resultResponse.details);
      }

      return resultResponse;

    } catch (error: any) {
      console.error(`${logPrefix} Unexpected error executing utility:`, error);
      return {
        success: false,
        error: 'Failed to execute search agents utility due to an unexpected error.',
        details: error instanceof Error ? error.message : String(error),
        hint: 'Contact support if the problem persists.'
      };
    }
  },
};

// Register the utility
registry.register(searchAgentsUtility); 