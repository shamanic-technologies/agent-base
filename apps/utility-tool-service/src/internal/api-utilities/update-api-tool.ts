/**
 * Internal Utility: Update API Tool
 *
 * Provides an internal utility interface to update an existing API tool.
 */
import {
    InternalUtilityTool,
    ServiceResponse,
    AgentInternalCredentials,
    ApiTool,
} from '@agent-base/types';
import { updateApiToolInternal } from '@agent-base/api-client';
import { registry } from '../../registry/registry.js';

const updateApiToolUtility: InternalUtilityTool = {
    id: 'update_api_tool',
    description: 'Updates an existing API tool. The caller must be the owner of the tool.',
    schema: {
        type: 'object',
        properties: {
            tool_id: {
                type: 'string',
                description: 'REQUIRED. The ID of the API tool to update.',
            },
            updates: {
                type: 'object',
                description: 'REQUIRED. An object containing the fields to update.',
            },
        },
        required: ['tool_id', 'updates'],
    },
    execute: async (
        clientUserId: string,
        clientOrganizationId: string,
        platformUserId: string,
        platformApiKey: string,
        conversationId: string,
        params: { tool_id: string; updates: Partial<ApiTool> },
        agentId?: string
    ): Promise<ServiceResponse<ApiTool>> => {
        const logPrefix = '🛠️ [UPDATE_API_TOOL_UTILITY]';
        try {
            const { tool_id, updates } = params;

            if (!tool_id || !updates) {
                return {
                    success: false,
                    error: "Invalid input: 'tool_id' and 'updates' parameters are required.",
                };
            }

            if (!clientUserId || !platformUserId || !platformApiKey || !agentId || !clientOrganizationId) {
                const missing = [
                    !clientUserId && 'clientUserId',
                    !clientOrganizationId && 'clientOrganizationId',
                    !platformUserId && 'platformUserId',
                    !platformApiKey && 'platformApiKey',
                    !agentId && 'agentId'
                ].filter(Boolean).join(', ');
                return { success: false, error: `Internal Error: Missing required credentials: ${missing}.` };
            }

            const agentInternalCredentials: AgentInternalCredentials = {
                platformUserId,
                clientUserId,
                clientOrganizationId,
                platformApiKey,
                agentId,
            };

            const resultResponse = await updateApiToolInternal(
                agentInternalCredentials,
                tool_id,
                updates
            );

            if (!resultResponse.success) {
                console.error(`${logPrefix} Error updating API tool:`, resultResponse);
            }

            return resultResponse;

        } catch (error: any) {
            console.error(`${logPrefix} Error executing utility:`, error);
            return {
                success: false,
                error: 'Failed to execute update API tool utility',
                details: error instanceof Error ? error.message : String(error),
            };
        }
    },
};

registry.register(updateApiToolUtility); 