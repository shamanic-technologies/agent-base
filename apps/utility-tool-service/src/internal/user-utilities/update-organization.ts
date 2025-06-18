/**
 * Internal Utility: Update Organization
 *
 * Provides an internal utility interface to update an organization.
 */
import {
  InternalUtilityTool,
  ServiceResponse,
  ClientOrganization,
  UpdateClientOrganizationInput,
} from '@agent-base/types';
import { updateOrganization, updateOrganizationApiClient } from '@agent-base/api-client';
import { registry } from '../../registry/registry.js';

const updateOrganizationUtility: InternalUtilityTool = {
  id: 'update_organization',
  description: "Updates an organization's details. Only the user who created the organization can update it.",
  schema: {
    type: 'object',
    properties: {
      organization_id: {
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
    required: ['organization_id'],
  },

  // No 'execute' function is provided, signaling this is a client-side tool.
};

registry.register(updateOrganizationUtility); 