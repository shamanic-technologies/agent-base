/**
 * List Dashboards Utility
 * 
 * This utility tool lists all available dashboards for a given user and organization,
 * returning basic information about each without the heavy configuration details.
 */
import { 
  InternalUtilityTool, 
  ErrorResponse,
  ServiceResponse,
  ExecuteToolResult,
  DashboardInfo,
} from '@agent-base/types';
import { registry } from '../../registry/registry.js';
import { listDashboardsForUserAndOrganizationApiClient } from '@agent-base/api-client';

// This utility does not require any specific input parameters from the agent,
// as it uses the context-provided user and organization IDs.

/**
 * Implementation of the List Dashboards utility
 */
const listDashboardsUtility: InternalUtilityTool = {
  id: 'utility_list_dashboards',
  description: 'Lists all available dashboards for the current user and organization.',
  schema: {
    type: 'object',
    properties: {}, // No parameters needed
    required: []
  },
  
  execute: async (clientUserId: string, clientOrganizationId: string, platformUserId: string, platformApiKey: string, conversationId: string): Promise<ServiceResponse<ExecuteToolResult>> => {
    const logPrefix = '📊 [LIST_DASHBOARDS]';
    try {
      console.log(`${logPrefix} Fetching dashboards for org "${clientOrganizationId}" and user "${clientUserId}"`);
      
      const listResponse = await listDashboardsForUserAndOrganizationApiClient({
        clientUserId,
        clientOrganizationId,
        platformUserId,
        platformApiKey
      });

      if (!listResponse.success) {
        console.error(`${logPrefix} Failed to list dashboards from database service:`, listResponse.error);
        return {
            success: false,
            error: "Failed to list dashboards.",
            details: listResponse.error
        };
      }
      
      return { success: true, data: listResponse.data };
      
    } catch (error: any) {
      console.error(`${logPrefix} Unexpected error:`, error);
      return { 
        success: false, 
        error: "An unexpected error occurred while listing dashboards.", 
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// Register the utility
registry.register(listDashboardsUtility);

// Export the utility
export default listDashboardsUtility; 