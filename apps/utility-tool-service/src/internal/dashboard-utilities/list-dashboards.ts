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
import { listDashboardsApiClient } from '@agent-base/api-client';

// This utility does not require any specific input parameters from the agent,
// as it uses the context-provided user and organization IDs.

// --- Local Type Definitions for this Utility ---

export type ListDashboardsSuccessResponse_Local = DashboardInfo[];

export type ListDashboardsResponse_Local =
  ListDashboardsSuccessResponse_Local |
  ErrorResponse;

// --- End Local Type Definitions ---

/**
 * Implementation of the List Dashboards utility
 */
const listDashboardsUtility: InternalUtilityTool = {
  id: 'list_dashboards',
  description: 'Lists all available dashboards for the current user and organization. Provides a summary of each dashboard, including its ID and name.',
  schema: {}, // No parameters required
  
  execute: async (clientUserId: string, clientOrganizationId: string, platformUserId: string, platformApiKey: string, conversationId: string): Promise<ServiceResponse<ExecuteToolResult>> => {
    const logPrefix = '📊 [LIST_DASHBOARDS]';
    try {
      const listResponse : ServiceResponse<DashboardInfo[]> = await listDashboardsApiClient({
        clientUserId,
        clientOrganizationId,
        platformUserId,
        platformApiKey,
      });

      if (!listResponse.success) {
        console.error(`${logPrefix} Failed to list dashboards from service:`, listResponse.error);
        return listResponse;
      }
      
      return listResponse;
      
    } catch (error: any) {
      console.error(`${logPrefix} Unexpected error:`, error);
      return {
        success: false,
        error: "An unexpected error occurred while listing the dashboards.",
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// Register the utility
registry.register(listDashboardsUtility);

// Export the utility
export default listDashboardsUtility; 