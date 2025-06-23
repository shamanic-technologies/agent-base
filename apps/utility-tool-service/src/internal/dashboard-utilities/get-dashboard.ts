/**
 * Get Dashboard Utility
 * 
 * This utility tool retrieves the full configuration of a single, specific dashboard.
 */
import { 
  InternalUtilityTool, 
  ErrorResponse,
  ServiceResponse,
  ExecuteToolResult,
  Dashboard,
} from '@agent-base/types';
import { registry } from '../../registry/registry.js';
import { getDashboardByIdApiClient } from '@agent-base/api-client';

// --- Local Type Definitions for this Utility ---

export type GetDashboardSuccessResponse_Local = Dashboard;

export type GetDashboardResponse_Local =
  GetDashboardSuccessResponse_Local |
  ErrorResponse;

// --- End Local Type Definitions ---

/**
 * Implementation of the Get Dashboard utility
 */
const getDashboardUtility: InternalUtilityTool = {
  id: 'utility_get_dashboard',
  description: 'Retrieves the full configuration for a single dashboard by its unique ID. This is useful for inspecting or editing an existing dashboard.',
  schema: {
    type: 'object',
    properties: {
      dashboardId: {
        type: 'string',
        description: 'REQUIRED. The unique ID of the dashboard to retrieve.',
        examples: ['dsh-1234-abcd-5678']
      }
    },
    required: ['dashboardId']
  },
  
  execute: async (clientUserId: string, clientOrganizationId: string, platformUserId: string, platformApiKey: string, conversationId: string, params: { dashboardId: string }): Promise<ServiceResponse<ExecuteToolResult>> => {
    const logPrefix = '📄 [GET_DASHBOARD]';
    const { dashboardId } = params;

    if (!dashboardId) {
      return { success: false, error: "dashboardId is a required parameter." };
    }

    try {
      const getResponse : ServiceResponse<Dashboard> = await getDashboardByIdApiClient(dashboardId, {
        clientUserId,
        clientOrganizationId,
        platformUserId,
        platformApiKey,
      });

      if (!getResponse.success) {
        console.error(`${logPrefix} Failed to get dashboard from service:`, getResponse.error);
        return getResponse;
      }

      return getResponse;
      
    } catch (error: any) {
      console.error(`${logPrefix} Unexpected error:`, error);
      return {
        success: false,
        error: "An unexpected error occurred while retrieving the dashboard.",
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// Register the utility
registry.register(getDashboardUtility);

// Export the utility
export default getDashboardUtility; 