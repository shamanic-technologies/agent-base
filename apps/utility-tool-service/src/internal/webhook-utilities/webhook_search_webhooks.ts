/**
 * Internal Utility: Webhook Search Webhooks
 * 
 * Defines the internal utility for searching webhooks via the webhook-store service.
 */
import { 
    InternalUtilityTool,
    ErrorResponse,
    ServiceResponse,
    InternalServiceCredentials,
    Webhook
} from '@agent-base/types';
import { searchWebhooksInternalApiService } from '@agent-base/api-client'; // Import the client function
import { registry } from '../../registry/registry.js';

// Define the expected parameter structure for the execute function
interface SearchWebhooksParams {
    query: string;
    limit?: number;
}

const webhookSearchWebhooksUtility: InternalUtilityTool = {
    id: 'webhook_search_webhooks',
    description: 'Searches for existing webhook definitions based on a query string.',
    schema: {
        type: 'object',
        required: ['query'], 
        properties: {
            query: { 
                type: 'string',
                description: 'The search term to filter webhooks by (e.g., name, provider ID).',
                examples: ['stripe', 'My Integration']
            },
            limit: { 
                type: 'integer',
                description: 'Optional maximum number of results to return.',
                examples: [10]
            },
        }
    },
  
    execute: async (
        clientUserId: string, 
        platformUserId: string,
        platformApiKey: string,
        conversationId: string, 
        params: SearchWebhooksParams, // Use the defined interface for params
        agentId?: string
    ): Promise<ServiceResponse<Webhook[]>> => {
        const logPrefix = '🛠️ [WEBHOOK_SEARCH_WEBHOOKS]';
        try {
            // Basic validation
            if (!params || !params.query) {
                console.error(`${logPrefix} Invalid or missing required parameter (query).`);
                return { 
                    success: false, 
                    error: "Invalid input: Missing required parameter (query)."
                };
            }

            // Prepare credentials for the API client call
            const credentials: InternalServiceCredentials = {
                platformUserId,
                clientUserId,
                platformApiKey,
                agentId
            };
            
            console.log(`${logPrefix} Attempting to search webhooks with query: ${params.query}`);
      
            // Call the client function from @agent-base/api-client
            // Ensure the parameter structure matches what searchWebhooks expects
            const resultResponse = await searchWebhooksInternalApiService(
                { query: params.query, limit: params.limit }, 
                credentials
            );

            if (!resultResponse.success) {
                console.error(`${logPrefix} Error searching webhooks:`, resultResponse.error);
            }
            
            console.log(`${logPrefix} Webhook store response received: success=${resultResponse.success}`);
      
            return resultResponse;

        } catch (error: any) {
            console.error(`${logPrefix} Error executing utility:`, error);
            return {
                success: false,
                error: 'Failed to execute webhook_search_webhooks utility',
                details: error instanceof Error ? error.message : String(error)
            };
        }
    }
};

// Register the utility
registry.register(webhookSearchWebhooksUtility);

// Optional: Export for testing
// export default webhookSearchWebhooksUtility; 