/**
 * Internal Utility: Webhook Test
 * 
 * Defines the internal utility for testing a webhook via the webhook-store service.
 */
import { 
    InternalUtilityTool,
    ServiceResponse,
    InternalServiceCredentials,
    WebhookTestResult // Assuming this is now available from @agent-base/types
} from '@agent-base/types';
import { testWebhookInternalApiService } from '@agent-base/api-client'; // Import the client function
import { registry } from '../../registry/registry.js';

// Define the expected parameter structure for the execute function
interface TestWebhookParams {
    webhookId: string;
}

const webhookTestWebhookUtility: InternalUtilityTool = {
    id: 'webhook_test_webhook',
    description: 'Tests a webhook by its ID, simulating an event and checking resolution.',
    schema: {
        type: 'object',
        required: ['webhookId'],
        properties: {
            webhookId: { 
                type: 'string',
                description: 'The unique ID of the webhook definition to test.',
                examples: ['wh_abc123xyz']
            },
        }
    },
  
    execute: async (
        clientUserId: string, 
        platformUserId: string,
        platformApiKey: string,
        conversationId: string, // Included as per standard execute signature, though not directly used by test API
        params: TestWebhookParams,
        agentId?: string // Included as per standard execute signature
    ): Promise<ServiceResponse<WebhookTestResult>> => {
        const logPrefix = '🛠️ [WEBHOOK_TEST_WEBHOOK]';
        try {
            if (!params || !params.webhookId) {
                console.error(`${logPrefix} Invalid or missing required parameter (webhookId).`);
                return { 
                    success: false, 
                    error: "Invalid input: Missing required parameter (webhookId)."
                };
            }

            const credentials: InternalServiceCredentials = {
                platformUserId,
                clientUserId,
                platformApiKey,
                agentId // Pass agentId if available
            };
            
            console.log(`${logPrefix} Attempting to test webhook: ${params.webhookId} for user ${clientUserId}`);
      
            const resultResponse = await testWebhookInternalApiService(
                params.webhookId,
                credentials
            );

            if (!resultResponse.success) {
                console.error(`${logPrefix} Error testing webhook:`, resultResponse.error);
            }
            
            console.log(`${logPrefix} Webhook store (test) response received: success=${resultResponse.success}`);
      
            return resultResponse;

        } catch (error: any) {
            console.error(`${logPrefix} Error executing utility:`, error);
            return {
                success: false,
                error: 'Failed to execute webhook_test_webhook utility',
                details: error instanceof Error ? error.message : String(error)
            };
        }
    }
};

// Register the utility
registry.register(webhookTestWebhookUtility);

// Optional: Export for testing
// export default webhookTestWebhookUtility; 