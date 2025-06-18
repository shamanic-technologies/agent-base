/**
 * Internal Utility: Delete Organization
 *
 * Provides an internal utility interface to delete an organization.
 */
import {
  InternalUtilityTool,
  ServiceResponse,
} from '@agent-base/types';
import { deleteOrganization } from '@agent-base/api-client';
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

  // No 'execute' function is provided, signaling this is a client-side tool.
};

registry.register(deleteOrganizationUtility); 