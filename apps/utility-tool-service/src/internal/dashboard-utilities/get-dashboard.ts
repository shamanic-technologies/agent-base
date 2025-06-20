/**
 * Get Dashboard Utility
 * 
 * This utility tool retrieves the full details of a single dashboard,
 * including its heavy web_container_config, by its ID.
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

export interface GetDashboardRequest {
  dashboardId: string;
}

/**
 * Implementation of the Get Dashboard utility
 */
const getDashboardUtility: InternalUtilityTool = {
  id: 'utility_get_dashboard',
  description: 'Retrieves the full details and configuration of a specific dashboard by its ID.',
  schema: {
    type: 'object',
    properties: {
        dashboardId: {
            type: 'string',
            description: 'The UUID of the dashboard to retrieve.',
            examples: ['dash_1750414220618']
        }
    },
    required: ['dashboardId']
  },
  
  execute: async (clientUserId: string, clientOrganizationId: string, platformUserId: string, platformApiKey: string, conversationId: string, params: GetDashboardRequest): Promise<ServiceResponse<ExecuteToolResult>> => {
    const logPrefix = '📄 [GET_DASHBOARD]';
    try {
      const { dashboardId } = params;
      if (!dashboardId) {
          return { success: false, error: "dashboardId is a required parameter." };
      }

      console.log(`${logPrefix} Fetching dashboard with ID "${dashboardId}"`);
      
      const getResponse = await getDashboardByIdApiClient(dashboardId, {
        clientUserId,
        clientOrganizationId,
        platformUserId,
        platformApiKey
      });

      if (!getResponse.success) {
        console.error(`${logPrefix} Failed to get dashboard from database service:`, getResponse.error);
        return {
            success: false,
            error: "Failed to get the dashboard.",
            details: getResponse.error
        };
      }
      
      return { success: true, data: getResponse.data };
      
    } catch (error: any) {
      console.error(`${logPrefix} Unexpected error:`, error);
      return { 
        success: false, 
        error: "An unexpected error occurred while getting the dashboard.", 
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// Register the utility
registry.register(getDashboardUtility);

// Export the utility
export default getDashboardUtility; 