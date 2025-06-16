/**
 * Internal Utility: Update Webhook
 * 
 * Provides an internal utility interface to update an existing webhook definition.
 */
import {
    InternalUtilityTool,
    ServiceResponse,
    AgentInternalCredentials,
    WebhookData,
    Webhook,
} from '@agent-base/types';
import { updateWebhookInternalApiService } from '@agent-base/api-client';
import { registry } from '../../registry/registry.js';

const updateWebhookUtility: InternalUtilityTool = {
    id: 'webhook_update_webhook',
    description: 'Updates an existing webhook. The caller must be the owner of the webhook.',
    schema: {
        type: 'object',
        properties: {
            webhook_id: {
                type: 'string',
                description: 'REQUIRED. The ID of the webhook to update.',
            },
            updates: {
                type: 'object',
                description: 'REQUIRED. An object containing the fields to update.',
            },
        },
        required: ['webhook_id', 'updates'],
    },
    execute: async (
        clientUserId: string,
        clientOrganizationId: string,
        platformUserId: string,
        platformApiKey: string,
        conversationId: string,
        params: { webhook_id: string; updates: Partial<WebhookData> },
        agentId?: string
    ): Promise<ServiceResponse<Webhook>> => {
        const logPrefix = '🛠️ [UPDATE_WEBHOOK_UTILITY]';
        try {
            const { webhook_id, updates } = params;

            if (!webhook_id || !updates) {
                console.error(`${logPrefix} Invalid input: 'webhook_id' and 'updates' parameters are required.`);
                return {
                    success: false,
                    error: "Invalid input: 'webhook_id' and 'updates' parameters are required.",
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

            const resultResponse = await updateWebhookInternalApiService(
                webhook_id,
                updates,
                agentInternalCredentials
            );

            if (!resultResponse.success) {
                console.error(`${logPrefix} Error updating webhook:`, resultResponse);
            }

            return resultResponse;

        } catch (error: any) {
            console.error(`${logPrefix} Error executing utility:`, error);
            return {
                success: false,
                error: 'Failed to execute update webhook utility',
                details: error instanceof Error ? error.message : String(error),
            };
        }
    },
};

registry.register(updateWebhookUtility); 