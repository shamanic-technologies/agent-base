/**
 * Internal Utility: Webhook Search Webhooks
 * 
 * Defines the internal utility for searching webhooks via the webhook-store service.
 */
import { 
    InternalUtilityTool,
    ErrorResponse,
    ServiceResponse,
    HumanInternalCredentials, 
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
    description: 'Searches for existing webhook',
    schema: {
        type: 'object',
        properties: {
            query: { 
                type: 'string',
                description: 'The search term to filter webhooks. Provide an empty string to list all.',
                examples: ['stripe refund', 'new email', 'whatsapp message received']
            },
            limit: { 
                type: 'integer',
                description: 'Optional maximum number of results to return.',
                examples: [10]
            },
        },
    },
  
    execute: async (
        clientUserId: string, 
        clientOrganizationId: string,
        platformUserId: string,
        platformApiKey: string,
        conversationId: string, 
        params: SearchWebhooksParams, // query is string, but can be empty
        agentId?: string
    ): Promise<ServiceResponse<Webhook[]>> => {
        const logPrefix = '🛠️ [WEBHOOK_SEARCH_WEBHOOKS]';
        try {
            // Validation: params must exist, and if query is provided, it must be a string.
            // An empty string for query is now acceptable.
            if (!params || (params.query !== undefined && typeof params.query !== 'string')) {
                console.error(`${logPrefix} Invalid parameters. 'query' must be a string if provided.`);
                return { 
                    success: false, 
                    error: "Invalid input: 'query' must be a string if provided."
                };
            }

            // Prepare credentials for the API client call
            const credentials: HumanInternalCredentials = {
                platformUserId,
                clientOrganizationId,
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