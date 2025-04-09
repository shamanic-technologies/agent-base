/**
 * Service for interacting with the Database Service API.
 * Provides functions to call database-service endpoints for webhook management.
 */

/**
 * Represents the expected structure of the data returned by the database service 
 * when successfully mapping an agent to a webhook.
 */
interface MapAgentSuccessData {
  agent_id: string;
  webhook_provider_id: string;
  user_id: string;
}

/**
 * Represents the structure of error responses from the database service.
 */
interface DatabaseServiceError {
  success: false;
  error: string;
  details?: string;
}

/**
 * Sets up a webhook configuration and maps an agent to it by calling the database service.
 * 
 * This function performs two sequential API calls:
 * 1. POST /webhooks: Creates or updates the webhook configuration for the provider and user.
 * 2. POST /webhooks/map-agent: Maps the specified agent to the created/updated webhook configuration.
 * 
 * @param {string} webhook_provider_id - The identifier of the webhook provider (e.g., 'slack').
 * @param {string} user_id - The UUID of the user.
 * @param {string} agent_id - The UUID of the agent to map.
 * @param {Record<string, any>} [webhook_data={}] - Optional data associated with the webhook configuration.
 * @returns {Promise<MapAgentSuccessData>} A promise that resolves with the data returned by the successful map-agent call.
 * @throws {Error} Throws an error if the DATABASE_SERVICE_URL is not set, if either API call fails (network or non-OK status), or if parsing the response fails.
 */
export async function setupWebhookAndMapAgent(
  webhook_provider_id: string,
  user_id: string,
  agent_id: string,
  webhook_data: Record<string, any> = {}
): Promise<MapAgentSuccessData> {
  
  // Retrieve the Database Service URL from environment variables.
  const databaseServiceUrl = process.env.DATABASE_SERVICE_URL;
  if (!databaseServiceUrl) {
    console.error('[WebhookService][DatabaseService] DATABASE_SERVICE_URL environment variable is not set.');
    // Throw a configuration error if the URL is missing.
    throw new Error('Internal server configuration error: Database service URL is missing.');
  }

  try {
    // Step 1: Call database-service to create/update the webhook configuration.
    console.log(`[WebhookService][DatabaseService] Calling POST ${databaseServiceUrl}/webhooks for user ${user_id}, provider ${webhook_provider_id}`);
    const createWebhookResponse = await fetch(`${databaseServiceUrl}/webhooks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhook_provider_id, user_id, webhook_data }),
    });

    // Check if the first API call was successful.
    if (!createWebhookResponse.ok) {
      let errorDetails = `Status: ${createWebhookResponse.status}`; 
      try {
        // Attempt to parse error details from the response body.
        const errorData: DatabaseServiceError = await createWebhookResponse.json();
        errorDetails = errorData.error || errorData.details || errorDetails;
      } catch (parseError) {
        // If parsing fails, use the status text.
        errorDetails = createWebhookResponse.statusText;
      }
      console.error(`[WebhookService][DatabaseService] Failed POST /webhooks: ${errorDetails}`);
      // Throw an error indicating failure in the first step.
      throw new Error(`Failed to configure webhook in database service: ${errorDetails}`);
    }

    // Log success of the first step (optional, can remove if too verbose).
    const webhookResult = await createWebhookResponse.json();
    console.log('[WebhookService][DatabaseService] POST /webhooks successful:', webhookResult.data);

    // Step 2: Call database-service to map the agent to the webhook.
    console.log(`[WebhookService][DatabaseService] Calling POST ${databaseServiceUrl}/webhooks/map-agent for user ${user_id}, agent ${agent_id}, provider ${webhook_provider_id}`);
    const mapAgentResponse = await fetch(`${databaseServiceUrl}/webhooks/map-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_id, webhook_provider_id, user_id }),
    });

    // Check if the second API call was successful.
    if (!mapAgentResponse.ok) {
      let errorDetails = `Status: ${mapAgentResponse.status}`; 
      try {
        // Attempt to parse error details.
        const errorData: DatabaseServiceError = await mapAgentResponse.json();
        errorDetails = errorData.error || errorData.details || errorDetails;
      } catch (parseError) {
        errorDetails = mapAgentResponse.statusText;
      }
      console.error(`[WebhookService][DatabaseService] Failed POST /webhooks/map-agent: ${errorDetails}`);
      // Throw an error indicating failure in the second step.
      throw new Error(`Failed to map agent to webhook in database service: ${errorDetails}`);
    }

    // Parse the successful response data from the map-agent call.
    const mapResult = await mapAgentResponse.json();
    console.log('[WebhookService][DatabaseService] POST /webhooks/map-agent successful:', mapResult.data);
    
    // Return the data from the successful mapping operation.
    // Type assertion ensures the caller knows the expected structure on success.
    return mapResult.data as MapAgentSuccessData;

  } catch (error: unknown) {
    // Catch fetch errors (network issues) or errors thrown from non-OK responses.
    console.error('[WebhookService][DatabaseService] Error during database service interaction:', error);
    // Re-throw the error to be handled by the route handler.
    // Prepend context to the error message.
    throw new Error(`Database service interaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 