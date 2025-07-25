/**
 * List Dashboard Blocks Utility
 *
 * This utility tool lists all available dashboard block templates that can be used
 * to construct a dashboard layout.
 */
import {
  InternalUtilityTool,
  ErrorResponse,
  ServiceResponse,
  ExecuteToolResult,
  DashboardBlockInfo,
} from '@agent-base/types';
import { registry } from '../../registry/registry.js';
import { listDashboardBlocksApiClient } from '@agent-base/api-client';

// --- Local Type Definitions for this Utility ---



// --- End Local Type Definitions ---

/**
 * Implementation of the List Dashboard Blocks utility
 */
const listDashboardBlocksUtility: InternalUtilityTool = {
  id: 'list_dashboard_blocks',
  description: 'Lists all available dashboard block templates. This provides the essential information (ID, name, description, type) for each block that can be used to build a dashboard layout.',
  schema: {
    type: 'object',
    properties: {},
  },

  execute: async (clientUserId: string, clientOrganizationId: string, platformUserId: string, platformApiKey: string, conversationId: string): Promise<ServiceResponse<ExecuteToolResult>> => {
    const logPrefix = '🧱 [LIST_DASHBOARD_BLOCKS]';
    try {
      const listResponse = await listDashboardBlocksApiClient({
        clientUserId,
        clientOrganizationId,
        platformUserId,
        platformApiKey,
      });

      if (!listResponse.success) {
        console.error(`${logPrefix} Failed to list dashboard blocks from service:`, listResponse.error);
        return listResponse;
      }
      
      return listResponse;
      
    } catch (error: any) {
      console.error(`${logPrefix} Unexpected error:`, error);
      return {
        success: false,
        error: "An unexpected error occurred while listing the dashboard blocks.",
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// Register the utility
registry.register(listDashboardBlocksUtility);

// Export the utility
export default listDashboardBlocksUtility; 