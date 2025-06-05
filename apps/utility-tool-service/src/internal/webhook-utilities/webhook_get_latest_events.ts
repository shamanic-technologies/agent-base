/**
 * Internal Utility: Webhook Get Latest Events for User/Organization
 * 
 * Defines the internal utility for fetching the N latest webhook events 
 * for a given user and organization via the webhook-tool service.
 */
import { 
    InternalUtilityTool,
    ErrorResponse,
    ServiceResponse,
    WebhookEvent,
    HumanInternalCredentials // For the SDK client call
} from '@agent-base/types';
import { getLatestWebhookEvents } from '@agent-base/api-client'; // Import the SDK client function
import { registry } from '../../registry/registry.js';

// Define the expected parameter structure for the execute function
interface GetLatestEventsParams {
    limit?: number; // Optional limit for the number of events
}

const webhookGetLatestEvents: InternalUtilityTool = {
    id: 'webhook_get_latest_events',
    description: 'Fetches the N latest webhook events for the current user/organization.',
    schema: {
        type: 'object',
        properties: {
            limit: { 
                type: 'integer',
                description: 'Optional maximum number of webhook events to return. Defaults to server-side value (usually 10).',
                examples: [5, 20],
                minimum: 1
            },
        },
        required: [] // No required parameters for the utility input itself
    },
  
    execute: async (
        clientUserId: string, 
        clientOrganizationId: string,
        platformUserId: string, // Available, but not directly used in AgentBaseCredentials for this call
        platformApiKey: string,
        conversationId: string, // Available, but not directly used by this utility's core logic
        params: GetLatestEventsParams = {}, // Default to empty object if no params provided
        agentId?: string // Available, but not directly used in AgentBaseCredentials for this call
    ): Promise<ServiceResponse<WebhookEvent[]>> => {
        const logPrefix = '🛠️ [WEBHOOK_GET_LATEST_EVENTS]';
        try {
            let validatedLimit: number | undefined = undefined;
            if (params.limit !== undefined) {
                if (typeof params.limit !== 'number' || !Number.isInteger(params.limit) || params.limit < 1) {
                    console.error(`${logPrefix} Invalid 'limit' parameter: must be a positive integer. Received:`, params.limit);
                    return {
                        success: false,
                        error: "Invalid input: 'limit' must be a positive integer.",
                        hint: 'Ensure the limit is a whole number greater than 0.'
                    };
                }
                validatedLimit = params.limit;
            }

            // Prepare credentials for the API client call
            // The SDK expects AgentBaseCredentials
            const credentials: HumanInternalCredentials = {
                platformApiKey: platformApiKey,
                clientUserId: clientUserId, 
                clientOrganizationId: clientOrganizationId,
                platformUserId: platformUserId,
                agentId: agentId
            };
            
            console.log(`${logPrefix} Attempting to fetch latest webhook events. User: ${clientUserId}, Org: ${clientOrganizationId}, Limit: ${validatedLimit ?? 'default'}`);
      
            // Call the client function from @agent-base/api-client
            const resultResponse = await getLatestWebhookEvents(
                credentials,
                validatedLimit // Pass the validated limit, or undefined if not set
            );

            if (!resultResponse.success) {
                console.error(`${logPrefix} Error fetching latest events:`, resultResponse.error, resultResponse.details);
            } else {
                console.log(`${logPrefix} Successfully fetched ${resultResponse.data?.length ?? 0} latest events.`);
            }
      
            return resultResponse;

        } catch (error: any) {
            console.error(`${logPrefix} Unexpected error executing utility:`, error);
            return {
                success: false,
                error: 'Failed to execute webhook_get_latest_events utility',
                details: error instanceof Error ? error.message : String(error),
                hint: 'This should not happen. Contact support.'
            };
        }
    }
};

// Register the utility
registry.register(webhookGetLatestEvents);

// Optional: Export for testing or if other parts of the service need direct access (uncommon for registry pattern)
// export default webhookGetLatestEventsForUserOrgUtility; 