/**
 * Internal Utility: Webhook Create Webhook
 * 
 * Defines the internal utility for creating a webhook via the webhook-store service.
 */
import { 
    InternalUtilityTool,
    ErrorResponse,
    ServiceResponse,
    InternalServiceCredentials, // Use this type for credentials
    Webhook,              // Type for the result of createWebhook
    WebhookData           // Type for the input payload of createWebhook
} from '@agent-base/types';
import { createWebhookInternalApiService } from '@agent-base/api-client'; // Import the client function
import { registry } from '../../registry/registry.js';

const webhookCreateWebhookUtility: InternalUtilityTool = {
    id: 'webhook_create_webhook',
    description: 'Creates a new webhook definition in the system. Requires name, webhookProviderId, subscribedEventId, etc.',
    schema: {
        type: 'object',
        properties: {
            name: { 
                type: 'string',
                description: 'A descriptive name for the webhook.',
                examples: ['My Cool Integration Webhook']
            },
            description: { 
                type: 'string',
                description: 'A longer description for the webhook.'
            },
            webhookProviderId: { 
                type: 'string',
                description: 'The identifier for the webhook provider (e.g., \'stripe\', \'custom\').',
                examples: ['stripe'] 
            },
            subscribedEventId: { 
                type: 'string',
                description: 'A unique identifier for the specific event subscription this webhook represents (e.g., \'stripe_charge_succeeded\').',
                examples: ['stripe_charge_succeeded']
            },
            conversationIdIdentificationMapping: { 
                type: 'string',
                description: 'How to extract a unique conversation identifier from the payload (e.g., \"data.object.metadata.conversation_ref\"). Uses dot notation.',
                examples: ['data.object.metadata.conversation_ref']
            },
            creatorClientUserId: {
                type: 'string',
                description: 'The client user ID of the creator.'
            }
        },
        required: [
            'name',
            'webhookProviderId',
            'subscribedEventId',
            'conversationIdIdentificationMapping',
            'creatorClientUserId'
        ]
    },
  
    execute: async (
        clientUserId: string, 
        platformUserId: string,
        platformApiKey: string,
        conversationId: string, 
        params: WebhookData, // The parameters directly match the WebhookData type
        agentId?: string
    ): Promise<ServiceResponse<Webhook>> => {
        const logPrefix = '🛠️ [WEBHOOK_CREATE_WEBHOOK]';
        try {
            // Update validation based on actual WebhookData required fields
            if (!params || !params.name || !params.webhookProviderId || !params.subscribedEventId || !params.conversationIdIdentificationMapping || !params.creatorClientUserId) { 
                console.error(`${logPrefix} Invalid or missing required parameters.`);
                return { 
                    success: false, 
                    error: "Invalid input: Missing one or more required parameters for WebhookData (name, webhookProviderId, subscribedEventId, conversationIdIdentificationMapping, creatorClientUserId)."
                };
            }

            // Prepare credentials for the API client call
            const credentials: InternalServiceCredentials = {
                platformUserId,
                clientUserId,
                platformApiKey,
                agentId
            };
            
            console.log(`${logPrefix} Attempting to create webhook: ${params.name}`);
      
            // Call the client function from @agent-base/api-client
            const resultResponse = await createWebhookInternalApiService(
                params, // Pass the validated parameters payload
                credentials
            );

            if (!resultResponse.success) {
                console.error(`${logPrefix} Error creating webhook:`, resultResponse.error);
            }
            
            console.log(`${logPrefix} Webhook store response received: success=${resultResponse.success}`);
      
            return resultResponse;

        } catch (error: any) {
            console.error(`${logPrefix} Error executing utility:`, error);
            return {
                success: false,
                error: 'Failed to execute webhook_create_webhook utility',
                details: error instanceof Error ? error.message : String(error)
            };
        }
    }
};

// Register the utility
registry.register(webhookCreateWebhookUtility);

// Optional: Export for testing
// export default webhookCreateWebhookUtility; 