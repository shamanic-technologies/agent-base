/**
 * Internal Utility: Create Agent
 * 
 * Provides an internal utility interface to create a new agent
 * by calling the agent-service via the api-client.
 */
import {
  InternalUtilityTool,
  ServiceResponse,
  Agent,
  CreateClientUserAgentInput,
} from '@agent-base/types';
import { createAgentInternalService } from '@agent-base/api-client';
import { registry } from '../../registry/registry.js';

/**
 * Implementation of the Create Agent utility
 */
const createAgentUtility: InternalUtilityTool = {
  id: 'create_agent',
  description: 'Creates a new agent with specified details. Use this to expand the team of agents.',
  schema: {
    type: 'object',
    properties: {
      firstName: {
        type: 'string',
        description: "REQUIRED. The first name of the new agent.",
      },
      lastName: {
        type: 'string',
        description: "REQUIRED. The last name of the new agent.",
      },
      jobTitle: {
        type: 'string',
        description: "REQUIRED. The job title for the new agent (e.g., 'Customer Support Specialist').",
      },
      profilePicture: {
        type: 'string',
        description: "REQUIRED. URL or identifier for the new agent's profile picture.",
      },
      gender: {
        type: 'string',
        enum: ['man', 'woman', 'other'],
        description: "REQUIRED. The gender of the new agent.",
      },
      modelId: {
        type: 'string',
        description: "REQUIRED. The ID of the language model the new agent will use (e.g., 'claude-3-5-sonnet-20240620').",
      },
      memory: {
        type: 'string',
        description: "REQUIRED. The initial memory or background story for the new agent.",
      },
    },
    required: ['firstName', 'lastName', 'jobTitle', 'profilePicture', 'gender', 'modelId', 'memory'],
    examples: [
      {
        firstName: 'Alice',
        lastName: 'Wonder',
        jobTitle: 'Lead Analyst',
        profilePicture: 'AW',
        gender: 'woman',
        modelId: 'claude-3-5-sonnet-20240620',
        memory: 'Alice is a data analyst who is an expert in SQL and Python.',
      },
    ]
  },

  execute: async (
    clientUserId: string,
    clientOrganizationId: string,
    platformUserId: string,
    platformApiKey: string,
    conversationId: string,
    params: CreateClientUserAgentInput,
    agentId?: string // Not used for creation, but part of the standard signature
  ): Promise<ServiceResponse<Agent>> => {
    const logPrefix = '🤖 [CREATE_AGENT_UTILITY]';
    try {
      // Validate authentication details
      if (!clientUserId || !clientOrganizationId || !platformUserId || !platformApiKey) {
        console.error(`${logPrefix} Authentication details are missing.`);
        return {
          success: false,
          error: 'Internal Error: Authentication details are required to execute this utility.',
        };
      }
      
      // The `params` object directly matches the required input for the SDK function.
      // We just need to add the clientUserId and clientOrganizationId from the credentials.
      const agentCreateData: CreateClientUserAgentInput = {
        ...params,
        clientUserId,
        clientOrganizationId,
      };

      // Call the SDK function
      const resultResponse: ServiceResponse<Agent> = await createAgentInternalService(
        agentCreateData,
        platformUserId,
        platformApiKey,
        clientUserId,
        clientOrganizationId
      );

      if (!resultResponse.success) {
        console.error(`${logPrefix} Failed to create agent via API client:`, resultResponse.error, resultResponse.details);
      }

      return resultResponse;

    } catch (error: any) {
      console.error(`${logPrefix} Unexpected error executing utility:`, error);
      return {
        success: false,
        error: 'Failed to execute create agent utility due to an unexpected error.',
        details: error instanceof Error ? error.message : String(error),
        hint: 'Contact support if the problem persists.'
      };
    }
  },
};

// Register the utility
registry.register(createAgentUtility); 