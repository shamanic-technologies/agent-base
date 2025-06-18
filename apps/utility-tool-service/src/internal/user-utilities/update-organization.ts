/**
 * Internal Utility: Update Organization
 *
 * Provides an internal utility interface to update an organization.
 */
import {
  InternalUtilityTool,
} from '@agent-base/types';
import { registry } from '../../registry/registry.js';

const updateOrganizationUtility: InternalUtilityTool = {
  id: 'update_organization',
  description: "Updates an organization's details. Only the user who created the organization can update it.",
  schema: {
    type: 'object',
    properties: {
      client_organization_id: {
        type: 'string',
        description: 'The ID of the organization to update.',
      },
      name: {
        type: 'string',
        description: 'The new name for the organization.',
      },
      profile_image: {
        type: 'string',
        description: 'The new profile image URL for the organization.',
      },
    },
    required: ['client_organization_id'],
  },

  // No 'execute' function is provided, signaling this is a client-side tool.
};

registry.register(updateOrganizationUtility);
