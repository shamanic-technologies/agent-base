/**
 * Internal Utility: Webhook Create Webhook
 * 
 * Defines the internal utility for creating a webhook via the webhook-store service.
 */
import { 
    InternalUtilityTool,
    ErrorResponse,
    ServiceResponse,
    HumanInternalCredentials, // Use this type for credentials
    Webhook,              // Type for the result of createWebhook
    WebhookData           // Type for the input payload of createWebhook
} from '@agent-base/types';
import { createWebhookInternalApiService } from '@agent-base/api-client'; // Import the client function
import { registry } from '../../registry/registry.js';

const webhookCreateWebhookUtility: InternalUtilityTool = {
    id: 'webhook_create_webhook',
    description: 'Creates a new webhook for the user to subscribe',
    schema: {
        type: 'object',
        properties: {
            name: { 
                type: 'string',
                description: 'A descriptive name for the webhook.',
                examples: ['Stripe Refunds', 'Gmail New Emails']
            },
            description: { 
                type: 'string',
                description: 'A longer description for the webhook.'
            },
            webhookProviderId: { 
                type: 'string',
                description: 'The identifier for the webhook provider.',
                examples: ['stripe', 'gmail', 'github', 'openai'] 
            },
            subscribedEventId: { 
                type: 'string',
                description: 'A unique identifier for the specific event subscription this webhook represents.',
                examples: ['stripe_charge_succeeded', 'gmail_new_emails']
            },
            conversationIdIdentificationMapping: { 
                type: 'string',
                description: 'How to extract a unique conversation identifier from the payload. Uses dot notation.',
                examples: ['data.object.metadata.conversation_ref']
            },
        },
        required: [
            'name',
            'webhookProviderId',
            'subscribedEventId',
            'conversationIdIdentificationMapping',
        ]
    },
  
    execute: async (
        clientUserId: string, 
        clientOrganizationId: string,
        platformUserId: string,
        platformApiKey: string,
        conversationId: string, 
        params: WebhookData, // The parameters directly match the WebhookData type
        agentId?: string
    ): Promise<ServiceResponse<Webhook>> => {
        const logPrefix = '🛠️ [WEBHOOK_CREATE_WEBHOOK]';
        try {
            // Update validation based on actual WebhookData required fields
            if (!params || !params.name || !params.webhookProviderId || !params.subscribedEventId || !params.conversationIdIdentificationMapping) { 
                console.error(`${logPrefix} Invalid or missing required parameters.`);
                return { 
                    success: false, 
                    error: "Invalid input",
                    details: "Missing one or more required parameters (name, webhookProviderId, subscribedEventId, conversationIdIdentificationMapping)",
                    hint: "Read the utility description and examples carefully. Then retry."
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
            const resultResponse = await createWebhookInternalApiService(
                params, // Pass the validated parameters payload
                credentials
            );

            if (!resultResponse.success) {
                console.error(`${logPrefix} Error creating webhook:`, resultResponse.error);
            }
                  
            return resultResponse;

        } catch (error: any) {
            console.error(`${logPrefix} Error executing utility:`, error);
            return {
                success: false,
                error: 'Failed to execute webhook_create_webhook utility',
                details: error instanceof Error ? error.message : String(error),
                hint: 'Contact support if the problem persists.'
            };
        }
    }
};

// Register the utility
registry.register(webhookCreateWebhookUtility);
