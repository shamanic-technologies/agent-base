/**
 * Get Dashboard Block By ID Utility
 *
 * This utility tool retrieves the full definition of a single dashboard block template,
 * including its validation schema.
 */
import {
  InternalUtilityTool,
  ErrorResponse,
  ServiceResponse,
  ExecuteToolResult,
  DashboardBlock,
} from '@agent-base/types';
import { registry } from '../../registry/registry.js';
import { getDashboardBlockByIdApiClient } from '@agent-base/api-client';

// --- Local Type Definitions for this Utility ---

export type GetDashboardBlockSuccessResponse_Local = DashboardBlock;

export type GetDashboardBlockResponse_Local =
  GetDashboardBlockSuccessResponse_Local |
  ErrorResponse;

// --- End Local Type Definitions ---

/**
 * Implementation of the Get Dashboard Block By ID utility
 */
const getDashboardBlockByIdUtility: InternalUtilityTool = {
  id: 'utility_get_dashboard_block_by_id',
  description: 'Retrieves the full definition for a single dashboard block template by its unique ID. This is useful for inspecting the validation schema of a block before using it in a layout.',
  schema: {
    type: 'object',
    properties: {
      blockId: {
        type: 'string',
        description: 'REQUIRED. The unique ID of the block template to retrieve (e.g., "metric-card").',
      }
    },
    required: ['blockId']
  },

  execute: async (clientUserId: string, clientOrganizationId: string, platformUserId: string, platformApiKey: string, conversationId: string, params: { blockId: string }): Promise<ServiceResponse<ExecuteToolResult>> => {
    const logPrefix = '🧱 [GET_DASHBOARD_BLOCK_BY_ID]';
    const { blockId } = params;

    if (!blockId) {
      return { success: false, error: "blockId is a required parameter." };
    }

    try {
      const getResponse : ServiceResponse<DashboardBlock> = await getDashboardBlockByIdApiClient(blockId, {
        clientUserId,
        clientOrganizationId,
        platformUserId,
        platformApiKey,
      });

      if (!getResponse.success) {
        console.error(`${logPrefix} Failed to get dashboard block from service:`, getResponse.error);
        return getResponse;
      }
      
      return getResponse;
      
    } catch (error: any) {
      console.error(`${logPrefix} Unexpected error:`, error);
      return {
        success: false,
        error: "An unexpected error occurred while retrieving the dashboard block.",
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// Register the utility
registry.register(getDashboardBlockByIdUtility);

// Export the utility
export default getDashboardBlockByIdUtility; 