/**
 * Internal Utility: Rename API Tool
 *
 * Provides an internal utility interface to rename an existing API tool.
 */
import {
    InternalUtilityTool,
    ApiTool,
    ServiceResponse,
    AgentInternalCredentials,
} from '@agent-base/types';
import { renameApiToolInternal } from '@agent-base/api-client';
import { registry } from '../../registry/registry.js';

const renameApiToolUtility: InternalUtilityTool = {
    id: 'rename_api_tool',
    description: 'Renames an existing API tool. The caller must be the owner of the tool.',
    schema: {
        type: 'object',
        properties: {
            tool_id: {
                type: 'string',
                description: 'REQUIRED. The ID of the API tool to rename.',
            },
            new_name: {
                type: 'string',
                description: 'REQUIRED. The new name for the API tool.',
            },
        },
        required: ['tool_id', 'new_name'],
    },
    execute: async (
        clientUserId: string,
        clientOrganizationId: string,
        platformUserId: string,
        platformApiKey: string,
        conversationId: string,
        params: { tool_id: string; new_name: string },
        agentId?: string
    ): Promise<ServiceResponse<ApiTool>> => {
        const logPrefix = '🛠️ [RENAME_API_TOOL_UTILITY]';
        try {
            const { tool_id, new_name } = params;

            if (!tool_id || !new_name) {
                console.error(`${logPrefix} Invalid or missing parameters.`);
                return {
                    success: false,
                    error: "Invalid input: 'tool_id' and 'new_name' parameters are required.",
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

                console.error(`${logPrefix} Internal Error: Missing required credentials: ${missing}.`);
                return { success: false, error: `Internal Error: Missing required credentials: ${missing}.` };
            }


            const agentInternalCredentials: AgentInternalCredentials = {
                platformUserId,
                clientUserId,
                clientOrganizationId,
                platformApiKey,
                agentId,
            };

            const resultResponse: ServiceResponse<ApiTool> = await renameApiToolInternal(
                agentInternalCredentials,
                tool_id,
                { name: new_name }
            );

            if (!resultResponse.success) {
                console.error(`${logPrefix} Error renaming API tool:`, resultResponse);
            }

            return resultResponse;

        } catch (error: any) {
            console.error(`${logPrefix} Error executing utility:`, error);
            return {
                success: false,
                error: 'Failed to execute rename API tool utility',
                details: error instanceof Error ? error.message : String(error),
            };
        }
    },
};

registry.register(renameApiToolUtility); 