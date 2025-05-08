/**
 * Internal Utility: Webhook Link Agent
 * 
 * Defines the internal utility for linking an agent to a user-webhook link via the webhook-store service.
 */
import { 
    InternalUtilityTool,
    ErrorResponse,
    ServiceResponse,
    InternalServiceCredentials,
    WebhookAgentLink
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
    description: 'Links a specified agent to an existing user-webhook link.',
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
        platformUserId: string,
        platformApiKey: string,
        conversationId: string, 
        params: LinkAgentParams, // Use the defined interface for params
        agentId?: string // This is the ID of the agent *calling* the tool
    ): Promise<ServiceResponse<WebhookAgentLink>> => {
        const logPrefix = '🛠️ [WEBHOOK_LINK_AGENT]';
        try {
            // Basic validation
            if (!params || !params.webhookId || !params.agentIdToLink) {
                console.error(`${logPrefix} Invalid or missing required parameters (webhookId, agentIdToLink).`);
                return { 
                    success: false, 
                    error: "Invalid input: Missing required parameters (webhookId, agentIdToLink)."
                };
            }

            // Prepare credentials for the API client call
            const credentials: InternalServiceCredentials = {
                platformUserId,
                clientUserId,
                platformApiKey,
                agentId // Pass the calling agent's ID if needed by the client/endpoint
            };
            
            console.log(`${logPrefix} Attempting to link agent ${params.agentIdToLink} to webhook: ${params.webhookId}`);
      
            // Call the client function from @agent-base/api-client
            const resultResponse = await linkAgentToWebhookInternalApiService(
                params.webhookId,
                params.agentIdToLink, // Pass the agent ID to be linked
                credentials
            );

            if (!resultResponse.success) {
                console.error(`${logPrefix} Error linking agent to webhook:`, resultResponse.error);
            }
            
            console.log(`${logPrefix} Webhook store response received: success=${resultResponse.success}`);
      
            return resultResponse;

        } catch (error: any) {
            console.error(`${logPrefix} Error executing utility:`, error);
            return {
                success: false,
                error: 'Failed to execute webhook_link_agent utility',
                details: error instanceof Error ? error.message : String(error)
            };
        }
    }
};

// Register the utility
registry.register(webhookLinkAgentUtility);

// Optional: Export for testing
// export default webhookLinkAgentUtility; 