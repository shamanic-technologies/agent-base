/**
 * Update Dashboard Utility
 *
 * This utility tool updates an existing dashboard's name and/or layout configuration.
 */
import {
  InternalUtilityTool,
  ErrorResponse,
  ServiceResponse,
  ExecuteToolResult,
  Dashboard,
  DashboardLayout,
  dashboardLayoutSchema,
} from '@agent-base/types';
import { registry } from '../../registry/registry.js';
import { updateDashboardApiClient } from '@agent-base/api-client';

/**
 * Implementation of the Update Dashboard utility
 */
const updateDashboardUtility: InternalUtilityTool = {
  id: 'update_dashboard',
  description: "Updates a dashboard's name and/or its layout configuration. At least one of 'name' or 'layout' must be provided.",
  schema: {
    type: 'object',
    properties: {
        dashboardId: {
            type: 'string',
            description: 'REQUIRED. The unique ID of the dashboard to update.',
        },
        name: {
            type: 'string',
            description: 'The new name for the dashboard.',
        },
        layout: {
            type: 'object',
            description: 'The new layout object for the dashboard.',
        }
    },
    required: ['dashboardId']
  },

  execute: async (clientUserId: string, clientOrganizationId: string, platformUserId: string, platformApiKey: string, conversationId: string, params: { dashboardId: string, name?: string, layout?: DashboardLayout }): Promise<ServiceResponse<ExecuteToolResult>> => {
    const logPrefix = '✏️ [UPDATE_DASHBOARD]';
    const { dashboardId, name, layout } = params;

    if (!name && !layout) {
        return { success: false, error: "Validation failed: Either 'name' or 'layout' must be provided." };
    }

    try {
      const updateResponse = await updateDashboardApiClient(
        dashboardId,
        { name, layout },
        { clientUserId, clientOrganizationId, platformUserId, platformApiKey }
      );

      if (!updateResponse.success) {
        console.error(`${logPrefix} Failed to update dashboard from service:`, updateResponse.error, updateResponse.details);
        return updateResponse;
      }

      return updateResponse;
      
    } catch (error: any) {
      console.error(`${logPrefix} Unexpected error:`, error);
      return {
        success: false,
        error: "An unexpected error occurred while updating the dashboard.",
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// Register the utility
registry.register(updateDashboardUtility);

// Export the utility
export default updateDashboardUtility; 