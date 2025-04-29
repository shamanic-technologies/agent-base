/**
 * Internal Utility: Webhook Create Webhook
 * 
 * Defines the internal utility for creating a webhook via the webhook-store service.
 */
import { 
    InternalUtilityTool,
    JsonSchema,
    ServiceResponse,
    InternalServiceCredentials, // Use this type for credentials
    Webhook,              // Type for the result of createWebhook
    WebhookData           // Type for the input payload of createWebhook
} from '@agent-base/types';
import { createWebhook } from '@agent-base/api-client'; // Import the client function
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
            requiredSecrets: { 
                type: 'array',
                items: { type: 'string' }, 
                description: 'List of secrets needed to identify user/conversation from the payload (e.g., [\'customer_id\', \'invoice_id\']).',
                examples: [ ['customer_id'] ]
            },
            clientUserIdentificationMapping: { 
                type: 'object',
                additionalProperties: { type: 'string' },
                description: 'How to map requiredSecrets from the payload to find the clientUserId (e.g., { \"customer_id\": \"data.object.customer\" }). Uses dot notation for nested fields.',
                examples: [ { "customer_id": "data.object.customer" } ]
            },
            conversationIdIdentificationMapping: { 
                type: 'string',
                description: 'How to extract a unique conversation identifier from the payload (e.g., \"data.object.metadata.conversation_ref\"). Uses dot notation.',
                examples: ['data.object.metadata.conversation_ref']
            },
            eventPayloadSchema: { 
                type: 'object',
                additionalProperties: true, 
                description: 'A JSON schema describing the expected structure of the incoming webhook payload for documentation/validation purposes.',
                examples: [ { "type": "object", "properties": { "data": { "type": "object" } } } ]
            },
        },
        required: [
            'name', 
            'webhookProviderId', 
            'subscribedEventId', 
            'requiredSecrets', 
            'clientUserIdentificationMapping', 
            'conversationIdIdentificationMapping', 
            'eventPayloadSchema'
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
            if (!params || !params.name || !params.webhookProviderId || !params.subscribedEventId || !params.requiredSecrets || !params.clientUserIdentificationMapping || !params.conversationIdIdentificationMapping || !params.eventPayloadSchema) { 
                console.error(`${logPrefix} Invalid or missing required parameters.`);
                return { 
                    success: false, 
                    error: "Invalid input: Missing one or more required parameters for WebhookData."
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
            const resultResponse = await createWebhook(
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