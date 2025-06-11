/**
 * Internal Utility: Get User Actions
 * 
 * Provides an internal utility interface to retrieve all actions (tool calls and results)
 * for a specified client user by calling the agent-service via the api-client.
 */
import {
  InternalUtilityTool,
  ServiceResponse,
  Action, 
} from '@agent-base/types';
import { getAllActionsForUserFromAgentService } from '@agent-base/api-client';
import { registry } from '../../registry/registry.js';

/**
 * Implementation of the Get Agent Actions utility
 */
const getActionsUtility: InternalUtilityTool = {
  id: 'get_actions',
  description: 'Retrieves tool actions (tool calls and their results) performed by agents for the current user. Returns the last N actions, defaulting to 10.',
  schema: {
    type: 'object',
    properties: {
      limit: {
        type: 'integer',
        description: 'Optional. The maximum number of recent actions to retrieve. Defaults to 10 if not specified.',
        minimum: 1,
      }
    },
    required: [], // limit is optional
    examples: [
      {},
      {
        limit: 5
      }
    ]
  },

  execute: async (
    clientUserId: string,
    clientOrganizationId: string,
    platformUserId: string,
    platformApiKey: string,
    conversationId: string, 
    params: { limit?: number }, // Updated params to include optional limit
    agentId?: string
  ): Promise<ServiceResponse<Action[]>> => {
    const logPrefix = '🔍 [GET_ACTIONS_UTILITY]'; // Corrected log prefix to match your previous change
    try {
      if (!clientUserId || !clientOrganizationId || !platformUserId || !platformApiKey) {
        console.error(`${logPrefix} Authentication details (clientUserId, clientOrganizationId, platformUserId, platformApiKey) are missing.`);
        return {
          success: false,
          error: 'Internal Error: Authentication details are required to execute this utility.',
        };
      }

      // Extract and validate limit from params
      let limitNum: number | undefined = undefined;
      if (params && typeof params.limit === 'number') {
        if (params.limit > 0) {
          limitNum = params.limit;
        } else {
          console.warn(`${logPrefix} Invalid limit value (${params.limit}) provided. Using default.`);
          // The SDK client/service will apply its own default if undefined is passed.
        }
      } else if (params && typeof params.limit !== 'undefined') {
        console.warn(`${logPrefix} Invalid type for limit parameter (${typeof params.limit}). Expected number. Using default.`);
      }
      // If limitNum is undefined here, the underlying SDK/service will use its default (10).

      console.log(`${logPrefix} Executing with clientUserId: ${clientUserId}, limit: ${limitNum === undefined ? 'default (10)' : limitNum}`);

      const resultResponse: ServiceResponse<Action[]> = await getAllActionsForUserFromAgentService(
        clientUserId,
        clientOrganizationId,
        platformUserId,
        platformApiKey,
        limitNum // Pass the parsed limit
      );

      if (resultResponse.success) {
        return resultResponse; 
      } else {
        console.error(`${logPrefix} Failed to retrieve user actions via API client:`, resultResponse.error, resultResponse.details);
        return resultResponse;
      }
    } catch (error: any) {
      console.error(`${logPrefix} Unexpected error executing utility for clientUserId ${clientUserId}:`, error);
      return {
        success: false,
        error: 'Failed to execute get user actions utility due to an unexpected error.',
        details: error instanceof Error ? error.message : String(error),
        hint: 'Contact support if the problem persists.'
      };
    }
  },
};

registry.register(getActionsUtility);

// Optional: Export for potential direct use or testing
// export default getUserActionsUtility; 