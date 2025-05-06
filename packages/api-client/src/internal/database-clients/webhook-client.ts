// /**
//  * Typed API client functions for interacting with the Database Service Webhook Endpoints.
//  */
// import { 
//   ServiceResponse,
//   Webhook, // Use camelCase type
//   WebhookEvent,
//   CreateWebhookRequest,
//   CreateWebhookAgentLinkRequest,
//   GetWebhookAgentLinkRequest,
//   WebhookAgentLink,
//   CreateWebhookEventRequest,
// } from '@agent-base/types';
// import { makeInternalAPIServiceRequest } from '../utils/service-client';
// import { getDatabaseServiceUrl } from '../utils/config'; // Import the centralized getter

// // ==============================================================================
// // Webhook Client Functions
// // ==============================================================================

// /**
//  * Creates or updates a webhook configuration.
//  * 
//  * Corresponds to: POST /webhooks/
//  * 
//  * @param data - Input data containing webhookProviderId, clientUserId, webhookCredentials.
//  * @param platformUserId - The platform user ID making the request (for headers).
//  * @returns A ServiceResponse containing the Webhook object or an error.
//  */
// export const createOrUpdateWebhookInternalApiService = async (
//   data: CreateWebhookRequest,
//   platformUserId: string,
//   platformApiKey: string,
//   clientUserId: string
// ): Promise<ServiceResponse<Webhook>> => {
//   const endpoint = '/webhooks/';
//   return makeInternalAPIServiceRequest<Webhook>(
//     getDatabaseServiceUrl(),
//     'POST',
//     endpoint,
//     platformUserId,
//     clientUserId,
//     platformApiKey,
//     data
//   );
// };

// /**
//  * Maps an agent to a specific webhook provider configuration for a user.
//  * 
//  * Corresponds to: POST /webhooks/map-agent
//  * 
//  * @param data - Input data containing agentId, webhookProviderId, clientUserId.
//  * @param platformUserId - The platform user ID making the request (for headers).
//  * @param platformApiKey - The platform API key for the request (for headers).
//  * @param clientUserId - The client user ID (for headers and context).
//  * @returns A ServiceResponse containing WebhookAgentLink or an error.
//  */
// export const CreateWebhookAgentLinkInternalApiService = async (
//   data: CreateWebhookAgentLinkRequest,
//   platformUserId: string,
//   platformApiKey: string,
//   clientUserId: string
// ): Promise<ServiceResponse<WebhookAgentLink>> => {

//   const endpoint = '/webhooks/map-agent';
//   return makeInternalAPIServiceRequest<WebhookAgentLink>(
//     getDatabaseServiceUrl(),
//     'POST',
//     endpoint,
//     platformUserId,
//     clientUserId,
//     platformApiKey,
//     data
//   );
// };

// /**
//  * Retrieves the agent mapping for a specific webhook provider and user.
//  * 
//  * Corresponds to: GET /webhooks/:webhookProviderId/agent
//  * 
//  * @param params - Path and query parameters (webhookProviderId, clientUserId).
//  * @param platformUserId - The platform user ID making the request (for headers).
//  * @returns A ServiceResponse containing WebhookAgentMapping or an error.
//  */
// export const getWebhookAgentLinkInternalApiService = async (
//   params: GetWebhookAgentLinkRequest,
//   platformUserId: string,
//   platformApiKey: string,
//   clientUserId: string
// ): Promise<ServiceResponse<string>> => {

//   const endpoint = `/webhooks/${params.webhookProviderId}/agent`;
//   // Pass clientUserId as query parameter
//   return makeInternalAPIServiceRequest<string>(
//     getDatabaseServiceUrl(),
//     'GET',
//     endpoint,
//     platformUserId,
//     clientUserId,
//     platformApiKey,
//     undefined, // No body
//     params
//   );
// };

// /**
//  * Creates a webhook event record.
//  * 
//  * Corresponds to: POST /webhooks/events
//  * 
//  * @param data - Input data containing webhookProviderId, clientUserId, webhookEventPayload.
//  * @param platformUserId - The platform user ID making the request (for headers).
//  * @returns A ServiceResponse containing the created WebhookEvent object or an error.
//  */
// export const createWebhookEventInternalApiService = async (
//   data: CreateWebhookEventRequest,
//   platformUserId: string,
//   platformApiKey: string,
//   clientUserId: string
// ): Promise<ServiceResponse<WebhookEvent>> => {

//   const endpoint = '/webhooks/events';
//   return makeInternalAPIServiceRequest<WebhookEvent>(
//     getDatabaseServiceUrl(),
//     'POST',
//     endpoint,
//     platformUserId,
//     clientUserId,
//     platformApiKey,
//     data
//   );
// };

// // /**
// //  * Retrieves user IDs associated with a specific Crisp website ID.
// //  * 
// //  * Corresponds to: GET /webhooks/crisp/users/:website_id
// //  * 
// //  * @param params - Path parameters containing websiteId.
// //  * @param platformUserId - The platform user ID making the request (for headers).
// //  * @returns A ServiceResponse containing CrispUsersResponse (with userIds array) or an error.
// //  */
// // export const getCrispWebsiteUserIds = async (
// //   params: GetCrispUsersParams,
// //   platformUserId: string,
// //   platformApiKey: string,
// //   clientUserId: string
// // ): Promise<ServiceResponse<CrispUsersResponse>> => {

// //   const endpoint = `/webhooks/crisp/users/${params.websiteId}`;
// //   return makeInternalAPIServiceRequest<CrispUsersResponse>(
// //     getDatabaseServiceUrl(),
// //     'GET',
// //     endpoint,
// //     platformUserId,
// //     clientUserId,
// //     platformApiKey,
// //     undefined, // No body
// //     undefined // No query params
// //   );
// // }; 