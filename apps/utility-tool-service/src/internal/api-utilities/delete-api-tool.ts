/**
 * Internal Utility: Delete API Tool
 *
 * Provides an internal utility interface to delete an existing API tool.
 */
import {
    InternalUtilityTool,
    ServiceResponse,
    AgentInternalCredentials,
} from '@agent-base/types';
import { deleteApiToolInternal } from '@agent-base/api-client';
import { registry } from '../../registry/registry.js';

const deleteApiToolUtility: InternalUtilityTool = {
    id: 'delete_api_tool',
    description: 'Deletes an existing API tool. The caller must be the owner of the tool.',
    schema: {
        type: 'object',
        properties: {
            tool_id: {
                type: 'string',
                description: 'REQUIRED. The ID of the API tool to delete.',
            },
        },
        required: ['tool_id'],
    },
    execute: async (
        clientUserId: string,
        clientOrganizationId: string,
        platformUserId: string,
        platformApiKey: string,
        conversationId: string,
        params: { tool_id: string },
        agentId?: string
    ): Promise<ServiceResponse<void>> => {
        const logPrefix = '🛠️ [DELETE_API_TOOL_UTILITY]';
        try {
            const { tool_id } = params;

            if (!tool_id) {
                return {
                    success: false,
                    error: "Invalid input: 'tool_id' parameter is required.",
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

            const resultResponse = await deleteApiToolInternal(
                agentInternalCredentials,
                tool_id
            );

            if (!resultResponse.success) {
                console.error(`${logPrefix} Error deleting API tool:`, resultResponse);
            }

            return resultResponse;

        } catch (error: any) {
            console.error(`${logPrefix} Error executing utility:`, error);
            return {
                success: false,
                error: 'Failed to execute delete API tool utility',
                details: error instanceof Error ? error.message : String(error),
            };
        }
    },
};

registry.register(deleteApiToolUtility); 