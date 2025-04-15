/**
 * Service for interacting with the Database Service API.
 * Provides functions to call database-service endpoints for webhook management.
 */
import { WebhookEvent, WebhookResponse, WebhookAgentMapping, Webhook, WebhookEventPayload, WebhookProvider } from '@agent-base/types';

/**
 * Stores a webhook event in the database.
 * 
 * @param {WebhookProvider} webhook_provider_id - The identifier of the webhook provider (e.g., 'slack', 'discord').
 * @param {string} user_id - The UUID of the user who owns the webhook.
 * @param {WebhookEventPayload} webhook_event_data - JSON data containing the event details.
 * @returns {Promise<boolean>} A promise that resolves to true if the operation was successful.
 * @throws {Error} Throws an error if the DATABASE_SERVICE_URL is not set or if the API call fails.
 */
export async function storeWebhookEvent(
  webhook_provider_id: WebhookProvider | string,
  user_id: string,
  webhook_event_payload: WebhookEventPayload
): Promise<boolean> {
  // Retrieve the Database Service URL from environment variables
  const databaseServiceUrl = process.env.DATABASE_SERVICE_URL;
  if (!databaseServiceUrl) {
    console.error('[WebhookService][DatabaseService] DATABASE_SERVICE_URL environment variable is not set.');
    throw new Error('Internal server configuration error: Database service URL is missing.');
  }

  try {
    console.log(`[WebhookService][DatabaseService] Calling POST ${databaseServiceUrl}/webhooks/events for user ${user_id}, provider ${webhook_provider_id}`);
    
    // Create the webhook event object using the WebhookEvent interface
    const webhookEvent: WebhookEvent = {
      webhook_provider_id,
      user_id,
      webhook_event_payload
    };
    
    const response = await fetch(`${databaseServiceUrl}/webhooks/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookEvent),
    });

    if (!response.ok) {
      let errorDetails = `Status: ${response.status}`;
      try {
        const errorData = await response.json() as WebhookResponse;
        errorDetails = errorData.error || errorDetails;
      } catch (parseError) {
        errorDetails = response.statusText;
      }
      console.error(`[WebhookService][DatabaseService] Failed POST /webhooks/events: ${errorDetails}`);
      throw new Error(`Failed to store webhook event in database service: ${errorDetails}`);
    }

    const result = await response.json() as WebhookResponse;
    console.log('[WebhookService][DatabaseService] POST /webhooks/events successful:', result.success);
    
    return true;
  } catch (error: unknown) {
    console.error('[WebhookService][DatabaseService] Error storing webhook event:', error);
    throw new Error(`Failed to store webhook event: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Sets up a webhook configuration and maps an agent to it by calling the database service.
 * 
 * This function performs two sequential API calls:
 * 1. POST /webhooks: Creates or updates the webhook configuration for the provider and user.
 * 2. POST /webhooks/map-agent: Maps the specified agent to the created/updated webhook configuration.
 * 
 * @param {WebhookProvider} webhook_provider_id - The identifier of the webhook provider (e.g., 'slack').
 * @param {string} user_id - The UUID of the user.
 * @param {string} agent_id - The UUID of the agent to map.
 * @param {Record<string, any>} [webhook_credentials={}] - Optional credentials associated with the webhook configuration.
 * @returns {Promise<WebhookAgentMapping>} A promise that resolves with the data returned by the successful map-agent call.
 * @throws {Error} Throws an error if the DATABASE_SERVICE_URL is not set, if either API call fails (network or non-OK status), or if parsing the response fails.
 */
export async function setupWebhookAndMapAgent(
  webhook_provider_id: WebhookProvider | string,
  user_id: string,
  agent_id: string,
  webhook_credentials: Record<string, any> = {}
): Promise<WebhookAgentMapping> {
  
  // Retrieve the Database Service URL from environment variables.
  const databaseServiceUrl = process.env.DATABASE_SERVICE_URL;
  if (!databaseServiceUrl) {
    console.error('[WebhookService][DatabaseService] DATABASE_SERVICE_URL environment variable is not set.');
    // Throw a configuration error if the URL is missing.
    throw new Error('Internal server configuration error: Database service URL is missing.');
  }

  try {
    // Create webhook data using the Webhook interface
    const webhookData: Webhook = {
      webhook_provider_id,
      user_id,
      webhook_credentials
    };
    
    // Step 1: Call database-service to create/update the webhook configuration.
    console.log(`[WebhookService][DatabaseService] Calling POST ${databaseServiceUrl}/webhooks for user ${user_id}, provider ${webhook_provider_id}`);
    const createWebhookResponse = await fetch(`${databaseServiceUrl}/webhooks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookData),
    });

    // Check if the first API call was successful.
    if (!createWebhookResponse.ok) {
      let errorDetails = `Status: ${createWebhookResponse.status}`; 
      try {
        // Attempt to parse error details from the response body.
        const errorData = await createWebhookResponse.json() as WebhookResponse;
        errorDetails = errorData.error || errorDetails;
      } catch (parseError) {
        // If parsing fails, use the status text.
        errorDetails = createWebhookResponse.statusText;
      }
      console.error(`[WebhookService][DatabaseService] Failed POST /webhooks: ${errorDetails}`);
      // Throw an error indicating failure in the first step.
      throw new Error(`Failed to configure webhook in database service: ${errorDetails}`);
    }

    // Log success of the first step (optional, can remove if too verbose).
    const webhookResult = await createWebhookResponse.json() as WebhookResponse;
    console.log('[WebhookService][DatabaseService] POST /webhooks successful:', webhookResult.data);

    // Create webhook agent mapping data using the WebhookAgentMapping interface
    const mappingData: WebhookAgentMapping = {
      agent_id,
      webhook_provider_id,
      user_id
    };
    
    // Step 2: Call database-service to map the agent to the webhook.
    console.log(`[WebhookService][DatabaseService] Calling POST ${databaseServiceUrl}/webhooks/map-agent for user ${user_id}, agent ${agent_id}, provider ${webhook_provider_id}`);
    const mapAgentResponse = await fetch(`${databaseServiceUrl}/webhooks/map-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mappingData),
    });

    // Check if the second API call was successful.
    if (!mapAgentResponse.ok) {
      let errorDetails = `Status: ${mapAgentResponse.status}`; 
      try {
        // Attempt to parse error details.
        const errorData = await mapAgentResponse.json() as WebhookResponse;
        errorDetails = errorData.error || errorDetails;
      } catch (parseError) {
        errorDetails = mapAgentResponse.statusText;
      }
      console.error(`[WebhookService][DatabaseService] Failed POST /webhooks/map-agent: ${errorDetails}`);
      // Throw an error indicating failure in the second step.
      throw new Error(`Failed to map agent to webhook in database service: ${errorDetails}`);
    }

    // Parse the successful response data from the map-agent call.
    const mapResult = await mapAgentResponse.json() as WebhookResponse;
    console.log('[WebhookService][DatabaseService] POST /webhooks/map-agent successful:', mapResult.data);
    
    // Return the data from the successful mapping operation.
    // Type assertion ensures the caller knows the expected structure on success.
    return mapResult.data as WebhookAgentMapping;

  } catch (error: unknown) {
    // Catch fetch errors (network issues) or errors thrown from non-OK responses.
    console.error('[WebhookService][DatabaseService] Error during database service interaction:', error);
    // Re-throw the error to be handled by the route handler.
    // Prepend context to the error message.
    throw new Error(`Database service interaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 