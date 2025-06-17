/**
 * Internal Utility: Get User Organizations
 *
 * Provides an internal utility interface to retrieve all organizations
 * for the specified client user by calling the user-service via the api-client.
 */
import {
  InternalUtilityTool,
  ServiceResponse,
  ClientOrganization,
} from '@agent-base/types';
import { getOrganizationsForUser } from '@agent-base/api-client';
import { registry } from '../../registry/registry.js';

/**
 * Implementation of the Get User Organizations utility
 */
const getOrganizationsUtility: InternalUtilityTool = {
  id: 'get_user_organizations',
  description: 'Retrieves all organizations the current user belongs to.',
  schema: {
    type: 'object',
    properties: {},
    required: [],
    examples: [
      {}
    ]
  },

  execute: async (
    clientUserId: string,
    clientOrganizationId: string,
    platformUserId: string,
    platformApiKey: string,
  ): Promise<ServiceResponse<ClientOrganization[]>> => {
    const logPrefix = '🔍 [GET_USER_ORGANIZATIONS_UTILITY]';
    try {
      if (!clientUserId || !clientOrganizationId || !platformUserId || !platformApiKey) {
        console.error(`${logPrefix} Authentication details are missing.`);
        return {
          success: false,
          error: 'Internal Error: Authentication details are required to execute this utility.',
        };
      }
      
      const resultResponse: ServiceResponse<ClientOrganization[]> = await getOrganizationsForUser({
        clientUserId,
        clientOrganizationId,
        platformUserId,
        platformApiKey,
      });

      if (resultResponse.success) {
        return resultResponse;
      } else {
        console.error(`${logPrefix} Failed to retrieve user organizations via API client:`, resultResponse.error, resultResponse.details);
        return resultResponse;
      }
    } catch (error: any) {
      console.error(`${logPrefix} Unexpected error executing utility for clientUserId ${clientUserId}:`, error);
      return {
        success: false,
        error: 'Failed to execute get user organizations utility due to an unexpected error.',
        details: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

registry.register(getOrganizationsUtility); 