/**
 * Internal Utility: Delete Organization
 *
 * Provides an internal utility interface to delete an organization.
 */
import {
  InternalUtilityTool,
  ServiceResponse,
} from '@agent-base/types';
import { deleteOrganizationApiClient } from '@agent-base/api-client';
import { registry } from '../../registry/registry.js';

const deleteOrganizationUtility: InternalUtilityTool = {
  id: 'delete_organization',
  description: 'Deletes an organization. Only the user who created the organization can delete it.',
  schema: {
    type: 'object',
    properties: {
      organization_id: {
        type: 'string',
        description: 'The ID of the organization to delete.',
      },
    },
    required: ['organization_id'],
  },

  execute: async (
    clientUserId: string,
    clientOrganizationId: string,
    platformUserId: string,
    platformApiKey: string,
    conversationId: string,
    params: { organization_id: string; }
  ): Promise<ServiceResponse<boolean>> => {
    const { organization_id } = params;

    return deleteOrganizationApiClient(organization_id, {
      clientUserId,
      clientOrganizationId,
      platformUserId,
      platformApiKey,
    });
  },
};

registry.register(deleteOrganizationUtility); 