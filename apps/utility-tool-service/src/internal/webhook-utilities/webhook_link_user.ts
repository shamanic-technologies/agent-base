/**
 * Internal Utility: Webhook Link User
 * 
 * Defines the internal utility for linking a user to a webhook via the webhook-store service.
 */
import { 
    InternalUtilityTool,
    ErrorResponse,
    ServiceResponse,
    HumanInternalCredentials,
    UserWebhook,
    SetupNeeded
} from '@agent-base/types';
import { linkUserToWebhookInternalApiService } from '@agent-base/api-client'; // Import the client function
import { registry } from '../../registry/registry.js';

// Define the expected parameter structure for the execute function
interface LinkUserParams {
    webhookId: string;
}

const webhookLinkUserUtility: InternalUtilityTool = {
    id: 'webhook_link_user',
    description: 'Links the current user to a specific webhook, potentially triggering a setup flow if needed.',
    schema: {
        type: 'object',
        required: ['webhookId'],
        properties: {
            webhookId: { 
                type: 'string',
                description: 'The unique ID of the webhook definition to link the user to.',
                examples: ['wh_abc123xyz']
            },
        }
    },
  
    execute: async (
        clientUserId: string, 
        clientOrganizationId: string,
        platformUserId: string,
        platformApiKey: string,
        conversationId: string, 
        params: LinkUserParams, // Use the defined interface for params
        agentId?: string
    ): Promise<ServiceResponse<UserWebhook | SetupNeeded>> => {
        const logPrefix = '🛠️ [WEBHOOK_LINK_USER]';
        try {
            // Basic validation
            if (!params || !params.webhookId) {
                console.error(`${logPrefix} Invalid or missing required parameter (webhookId).`);
                return { 
                    success: false, 
                    error: "Invalid input: Missing required parameter (webhookId).",
                    hint: 'Review the utility description and examples carefully. Then retry.'
                };
            }

            // Prepare credentials for the API client call
            const credentials: HumanInternalCredentials = {
                platformUserId,
                clientUserId,
                clientOrganizationId,
                platformApiKey,
                agentId
            };
                  
            // Call the client function from @agent-base/api-client
            const resultResponse: ServiceResponse<UserWebhook | SetupNeeded> = await linkUserToWebhookInternalApiService(
                params.webhookId,
                credentials
            );

            if (!resultResponse.success) {
                console.error(`${logPrefix} Error linking user to webhook:`, resultResponse.error);
            }
            
            console.debug(`${logPrefix} Webhook store response:`, resultResponse);

            return resultResponse;

        } catch (error: any) {
            console.error(`${logPrefix} Error executing utility:`, error);
            return {
                success: false,
                error: 'Failed to execute webhook_link_user utility',
                details: error instanceof Error ? error.message : String(error),
                hint: 'Contact support if the problem persists.'
            };
        }
    }
};

// Register the utility
registry.register(webhookLinkUserUtility);

// Optional: Export for testing
// export default webhookLinkUserUtility; 