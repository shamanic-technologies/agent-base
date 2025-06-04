/**
 * Internal Utility: Webhook Link Agent
 * 
 * Defines the internal utility for linking an agent to a user-webhook link via the webhook-store service.
 */
import { 
    InternalUtilityTool,
    ErrorResponse,
    ServiceResponse,
    HumanInternalCredentials,
    CreateAgentUserWebhookRequest
} from '@agent-base/types';
import { linkAgentToWebhookInternalApiService } from '@agent-base/api-client'; // Import the client function
import { registry } from '../../registry/registry.js';

// Define the expected parameter structure for the execute function
interface LinkAgentParams {
    webhookId: string;
    agentIdToLink: string; // Renamed to avoid conflict with agentId in execute signature
}

const webhookLinkAgentUtility: InternalUtilityTool = {
    id: 'webhook_link_agent',
    description: 'Set the agent that will receive the webhook events.',
    schema: {
        type: 'object',
        required: ['webhookId', 'agentIdToLink'], // Both required
        properties: {
            webhookId: { 
                type: 'string',
                description: 'The unique ID of the webhook definition.',
                examples: ['wh_abc123xyz']
            },
            agentIdToLink: { 
                type: 'string',
                description: 'The unique ID of the agent to link to the user-webhook association.',
                examples: ['agent_zyx987cba']
            },
        }
    },
  
    execute: async (
        clientUserId: string, 
        clientOrganizationId: string,
        platformUserId: string,
        platformApiKey: string,
        conversationId: string, 
        params: LinkAgentParams, // Use the defined interface for params
        agentId?: string // This is the ID of the agent *calling* the tool
    ): Promise<ServiceResponse<CreateAgentUserWebhookRequest>> => {
        const logPrefix = '🛠️ [WEBHOOK_LINK_AGENT]';
        try {
            // Basic validation
            if (!params || !params.webhookId || !params.agentIdToLink) {
                console.error(`${logPrefix} Invalid or missing required parameters (webhookId, agentIdToLink).`);
                return { 
                    success: false, 
                    error: "Invalid input: Missing required parameters (webhookId, agentIdToLink).",
                    hint: 'Review the utility description and examples carefully. Then retry.'
                };
            }

            // Prepare credentials for the API client call
            const credentials: HumanInternalCredentials = {
                platformUserId,
                clientUserId,
                clientOrganizationId,
                platformApiKey,
                agentId // Pass the calling agent's ID if needed by the client/endpoint
            };
                  
            // Call the client function from @agent-base/api-client
            const resultResponse = await linkAgentToWebhookInternalApiService(
                params.webhookId,
                params.agentIdToLink, // Pass the agent ID to be linked
                credentials
            );

            if (!resultResponse.success) {
                console.error(`${logPrefix} Error linking agent to webhook:`, resultResponse.error);
            }
                  
            return resultResponse;

        } catch (error: any) {
            console.error(`${logPrefix} Error executing utility:`, error);
            return {
                success: false,
                error: 'Failed to execute webhook_link_agent utility',
                details: error instanceof Error ? error.message : String(error),
                hint: 'Contact support if the problem persists.'
            };
        }
    }
};

// Register the utility
registry.register(webhookLinkAgentUtility);

// Optional: Export for testing
// export default webhookLinkAgentUtility; 