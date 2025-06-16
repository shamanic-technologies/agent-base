/**
 * Internal Utility: Rename Webhook
 * 
 * Provides an internal utility interface to rename an existing webhook definition.
 */
import {
    InternalUtilityTool,
    Webhook,
    ServiceResponse,
    AgentInternalCredentials,
} from '@agent-base/types';
import { renameWebhookInternalApiService } from '@agent-base/api-client';
import { registry } from '../../registry/registry.js';

const renameWebhookUtility: InternalUtilityTool = {
    id: 'webhook_rename_webhook',
    description: 'Renames an existing webhook. The caller must be the owner of the webhook.',
    schema: {
        type: 'object',
        properties: {
            webhook_id: {
                type: 'string',
                description: 'REQUIRED. The ID of the webhook to rename.',
            },
            new_name: {
                type: 'string',
                description: 'REQUIRED. The new name for the webhook.',
            },
        },
        required: ['webhook_id', 'new_name'],
    },
    execute: async (
        clientUserId: string,
        clientOrganizationId: string,
        platformUserId: string,
        platformApiKey: string,
        conversationId: string,
        params: { webhook_id: string; new_name: string },
        agentId?: string
    ): Promise<ServiceResponse<Webhook>> => {
        const logPrefix = '🛠️ [RENAME_WEBHOOK_UTILITY]';
        try {
            const { webhook_id, new_name } = params;

            if (!webhook_id || !new_name) {
                return {
                    success: false,
                    error: "Invalid input: 'webhook_id' and 'new_name' parameters are required.",
                };
            }

            if (!agentId) {
                return { success: false, error: 'Internal Error: agentId is required.' };
            }

            const agentInternalCredentials: AgentInternalCredentials = {
                platformUserId,
                clientUserId,
                clientOrganizationId,
                platformApiKey,
                agentId,
            };

            const resultResponse = await renameWebhookInternalApiService(
                webhook_id,
                new_name,
                agentInternalCredentials
            );

            if (!resultResponse.success) {
                console.error(`${logPrefix} Error renaming webhook:`, resultResponse);
            }

            return resultResponse;

        } catch (error: any) {
            console.error(`${logPrefix} Error executing utility:`, error);
            return {
                success: false,
                error: 'Failed to execute rename webhook utility',
                details: error instanceof Error ? error.message : String(error),
            };
        }
    },
};

registry.register(renameWebhookUtility); 