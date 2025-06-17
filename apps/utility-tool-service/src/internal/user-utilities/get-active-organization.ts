/**
 * Internal Utility: Get Active Organization
 *
 * This tool's execution is handled on the client-side. The Vercel AI SDK
 * will send a tool_calls message to the frontend, where the active
 * organization is retrieved from the Clerk SDK and sent back as a tool_result.
 *
 * This backend definition serves as a schema to make the tool discoverable
 * by the agent model.
 */
import {
  InternalUtilityTool,
  ServiceResponse,
  ClientOrganization,
} from '@agent-base/types';
import { registry } from '../../registry/registry.js';

const getActiveOrganizationUtility: InternalUtilityTool = {
  id: 'get_active_organization',
  description: "Retrieves the user's currently active organization from the frontend.",
  schema: {
    type: 'object',
    properties: {},
    required: [],
    examples: [
      {}
    ]
  },
};

registry.register(getActiveOrganizationUtility); 