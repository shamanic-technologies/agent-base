/**
 * Internal Utility: Delete Webhook
 * 
 * Provides an internal utility interface to delete an existing webhook definition.
 */
import {
    InternalUtilityTool,
    ServiceResponse,
    AgentInternalCredentials,
} from '@agent-base/types';
import { deleteWebhookInternalApiService } from '@agent-base/api-client';
import { registry } from '../../registry/registry.js';

const deleteWebhookUtility: InternalUtilityTool = {
    id: 'webhook_delete_webhook',
    description: 'Deletes an existing webhook. The caller must be the owner of the webhook.',
    schema: {
        type: 'object',
        properties: {
            webhook_id: {
                type: 'string',
                description: 'REQUIRED. The ID of the webhook to delete.',
            },
        },
        required: ['webhook_id'],
    },
    execute: async (
        clientUserId: string,
        clientOrganizationId: string,
        platformUserId: string,
        platformApiKey: string,
        conversationId: string,
        params: { webhook_id: string },
        agentId?: string
    ): Promise<ServiceResponse<void>> => {
        const logPrefix = '🛠️ [DELETE_WEBHOOK_UTILITY]';
        try {
            const { webhook_id } = params;

            if (!webhook_id) {
                console.error(`${logPrefix} Invalid input: 'webhook_id' parameter is required.`);
                return {
                    success: false,
                    error: "Invalid input: 'webhook_id' parameter is required.",
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

            const resultResponse = await deleteWebhookInternalApiService(
                webhook_id,
                agentInternalCredentials
            );

            if (!resultResponse.success) {
                console.error(`${logPrefix} Error deleting webhook:`, resultResponse);
            }

            return resultResponse;

        } catch (error: any) {
            console.error(`${logPrefix} Error executing utility:`, error);
            return {
                success: false,
                error: 'Failed to execute delete webhook utility',
                details: error instanceof Error ? error.message : String(error),
            };
        }
    },
};

registry.register(deleteWebhookUtility); 