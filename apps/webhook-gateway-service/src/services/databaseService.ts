// /**
//  * Service for interacting with the Database Service API.
//  * Provides functions to call database-service endpoints for webhook management.
//  */
// import { createOrUpdateWebhookInternalApiService, CreateWebhookAgentLinkInternalApiService } from '@agent-base/api-client';
// import { WebhookEvent,
//    Webhook,
//     WebhookEventPayload,
//      WebhookProviderId,
//       ErrorResponse,
//        ServiceResponse,
//         CreateWebhookAgentLinkRequest,
//          WebhookAgentLink, 
//          WebhookCredentials,
//           ServiceCredentials,
//            SetupWebhookRequest } from '@agent-base/types';

// /**
//  * Stores a webhook event in the database.
//  * 
//  * @param {WebhookProviderId} webhookProviderId - The identifier of the webhook provider (e.g., 'slack', 'discord').
//  * @param {string} clientUserId - The UUID of the user who owns the webhook.
//  * @param {WebhookEventPayload} webhookEventPayload - JSON data containing the event details.
//  * @returns {Promise<boolean>} A promise that resolves to true if the operation was successful.
//  * @throws {Error} Throws an error if the DATABASE_SERVICE_URL is not set or if the API call fails.
//  */
// export async function storeWebhookEvent(
//   webhookProviderId: WebhookProviderId,
//   clientUserId: string,
//   webhookEventPayload: WebhookEventPayload
// ): Promise<boolean> {
//   // Retrieve the Database Service URL from environment variables
//   const databaseServiceUrl = process.env.DATABASE_SERVICE_URL;
//   if (!databaseServiceUrl) {
//     console.error('[WebhookService][DatabaseService] DATABASE_SERVICE_URL environment variable is not set.');
//     throw new Error('Internal server configuration error: Database service URL is missing.');
//   }

//   try {
//     console.log(`[WebhookService][DatabaseService] Calling POST ${databaseServiceUrl}/webhooks/events for user ${clientUserId}, provider ${webhookProviderId}`);
    
//     // Create the webhook event object using the WebhookEvent interface
//     const webhookEvent: WebhookEvent = {
//       webhookProviderId,
//       clientUserId,
//       webhookEventPayload
//     };
    
//     const response = await fetch(`${databaseServiceUrl}/webhooks/events`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify(webhookEvent),
//     });

//     if (!response.ok) {
//       let errorDetails = `Status: ${response.status}`;
//       try {
//         const errorData = await response.json() as ErrorResponse;
//         errorDetails = errorData.error || errorDetails;
//       } catch (parseError) {
//         errorDetails = response.statusText;
//       }
//       console.error(`[WebhookService][DatabaseService] Failed POST /webhooks/events: ${errorDetails}`);
//       throw new Error(`Failed to store webhook event in database service: ${errorDetails}`);
//     }

//     const result = await response.json() as ServiceResponse<boolean>;
//     console.log('[WebhookService][DatabaseService] POST /webhooks/events successful:', result.success);
    
//     return true;
//   } catch (error: unknown) {
//     console.error('[WebhookService][DatabaseService] Error storing webhook event:', error);
//     throw new Error(`Failed to store webhook event: ${error instanceof Error ? error.message : 'Unknown error'}`);
//   }
// }

// /**
//  * Sets up a webhook configuration and maps an agent to it by calling the database service.
//  * 
//  * This function performs two sequential API calls:
//  * 1. POST /webhooks: Creates or updates the webhook configuration for the provider and user.
//  * 2. POST /webhooks/map-agent: Maps the specified agent to the created/updated webhook configuration.
//  * 
//  * @param {WebhookProviderId} webhookProviderId - The identifier of the webhook provider (e.g., 'slack').
//  * @param {string} clientUserId - The UUID of the user.
//  * @param {string} agentId - The UUID of the agent to map.
//  * @param {clientUserIdentificationMapping<string, any>} [webhookCredentials={}] - Optional credentials associated with the webhook configuration.
//  * @returns {Promise<WebhookAgentMapping>} A promise that resolves with the data returned by the successful map-agent call.
//  * @throws {Error} Throws an error if the DATABASE_SERVICE_URL is not set, if either API call fails (network or non-OK status), or if parsing the response fails.
//  */
// export async function createWebhookAgentLink(
//   serviceCredentials: ServiceCredentials,
//   setupWebhookRequest: SetupWebhookRequest
// ): Promise<ServiceResponse<WebhookAgentLink>> {
//   const { webhookProviderId, agentId, webhookCredentials } = setupWebhookRequest;
//   const { platformUserId, platformApiKey, clientUserId } = serviceCredentials;

//   try {
//     // Create webhook data using the Webhook interface
//     const webhookData: Webhook = {
//       webhookProviderId,
//       clientUserId,
//       webhookCredentials
//     };
    
//     const createWebhookResponse: ServiceResponse<Webhook> = await createOrUpdateWebhookInternalApiService(
//       webhookData,
//       platformUserId,
//       platformApiKey,
//       clientUserId
//     );

//     // Check if the first API call was successful.
//     if (!createWebhookResponse.success) {
//       console.error(`[WebhookService][DatabaseService] Failed POST /webhooks: ${createWebhookResponse.error}`);
//       return createWebhookResponse as ErrorResponse;
//     }


//     // Create webhook agent mapping data using the WebhookAgentMapping interface
//     const createWebhookAgentLinkRequest: CreateWebhookAgentLinkRequest = {
//       agentId,
//       webhookProviderId,
//     };
    
//     // Step 2: Call database-service to map the agent to the webhook.
//     const webhookAgentLinkResponse: ServiceResponse<WebhookAgentLink> = await CreateWebhookAgentLinkInternalApiService(
//       createWebhookAgentLinkRequest,
//       platformUserId,
//       platformApiKey,
//       clientUserId
//     );

//     // Check if the second API call was successful.
//     if (!webhookAgentLinkResponse.success) {
//       console.error(`[WebhookService][DatabaseService] Failed POST /webhooks/map-agent: ${webhookAgentLinkResponse.error}`);
//       return webhookAgentLinkResponse as ErrorResponse;
//     }

//     return webhookAgentLinkResponse;

//   } catch (error: unknown) {
//     // Catch fetch errors (network issues) or errors thrown from non-OK responses.
//     console.error('[WebhookService][DatabaseService] Error during database service interaction:', error);
//     return { success: false, error: error instanceof Error ? error.message : 'Unknown error' } as ErrorResponse;
//   }
// } 