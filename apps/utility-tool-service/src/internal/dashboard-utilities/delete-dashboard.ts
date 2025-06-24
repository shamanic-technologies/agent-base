/**
 * Delete Dashboard Utility
 *
 * This utility tool deletes an existing dashboard by its ID.
 */
import {
  InternalUtilityTool,
  ErrorResponse,
  ServiceResponse,
  ExecuteToolResult,
} from '@agent-base/types';
import { registry } from '../../registry/registry.js';
import { deleteDashboardApiClient } from '@agent-base/api-client';

// --- Local Type Definitions for this Utility ---

export interface DeleteDashboardSuccessResponse_Local {
    dashboardId: string;
    message: string;
}

export type DeleteDashboardResponse_Local =
  DeleteDashboardSuccessResponse_Local |
  ErrorResponse;

// --- End Local Type Definitions ---

/**
 * Implementation of the Delete Dashboard utility
 */
const deleteDashboardUtility: InternalUtilityTool = {
  id: 'delete_dashboard',
  description: 'Permanently deletes a dashboard by its unique ID.',
  schema: {
    type: 'object',
    properties: {
      dashboardId: {
        type: 'string',
        description: 'REQUIRED. The unique ID of the dashboard to delete.',
      }
    },
    required: ['dashboardId']
  },

  execute: async (clientUserId: string, clientOrganizationId: string, platformUserId: string, platformApiKey: string, conversationId: string, params: { dashboardId: string }): Promise<ServiceResponse<ExecuteToolResult>> => {
    const logPrefix = '🗑️ [DELETE_DASHBOARD]';
    const { dashboardId } = params;

    if (!dashboardId) {
      return { success: false, error: "dashboardId is a required parameter." };
    }

    try {
      const deleteResponse : ServiceResponse<{ message: string }> = await deleteDashboardApiClient(dashboardId, {
        clientUserId,
        clientOrganizationId,
        platformUserId,
        platformApiKey,
      });

      if (!deleteResponse.success) {
        console.error(`${logPrefix} Failed to delete dashboard from service:`, deleteResponse.error);
        return deleteResponse;
      }

      return deleteResponse;
      
    } catch (error: any) {
      console.error(`${logPrefix} Unexpected error:`, error);
      return {
        success: false,
        error: "An unexpected error occurred while deleting the dashboard.",
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// Register the utility
registry.register(deleteDashboardUtility);

// Export the utility
export default deleteDashboardUtility; 