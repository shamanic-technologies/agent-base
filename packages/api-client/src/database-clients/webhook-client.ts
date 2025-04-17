/**
 * Typed API client functions for interacting with the Database Service Webhook Endpoints.
 */
import { 
  ServiceResponse,
  Webhook, // Use camelCase type
  WebhookEvent,
  CrispUsersResponse,
  CreateWebhookRequest,
  MapAgentToWebhookRequest,
  CreateWebhookEventRequest,
  GetWebhookAgentRequest,
  GetCrispUsersParams
} from '@agent-base/types';
import { makeAPIServiceRequest } from '../utils/service-client';
// Use the same base URL as defined elsewhere or manage centrally
const DATABASE_SERVICE_URL = process.env.DATABASE_SERVICE_URL || 'http://localhost:3006'; // Ensure consistency

// ==============================================================================
// Webhook Client Functions
// ==============================================================================

/**
 * Creates or updates a webhook configuration.
 * 
 * Corresponds to: POST /webhooks/
 * 
 * @param data - Input data containing webhookProviderId, clientUserId, webhookCredentials.
 * @param platformUserId - The platform user ID making the request (for headers).
 * @returns A ServiceResponse containing the Webhook object or an error.
 */
export const createOrUpdateWebhookConfig = async (
  data: CreateWebhookRequest,
  platformUserId: string,
  platformApiKey: string,
  clientUserId: string
): Promise<ServiceResponse<Webhook>> => {
  const endpoint = '/webhooks/';
  return makeAPIServiceRequest<Webhook>(
    DATABASE_SERVICE_URL,
    'POST',
    endpoint,
    platformUserId,
    clientUserId,
    platformApiKey,
    data
  );
};

/**
 * Maps an agent to a specific webhook provider configuration for a user.
 * 
 * Corresponds to: POST /webhooks/map-agent
 * 
 * @param data - Input data containing agentId, webhookProviderId, clientUserId.
 * @param platformUserId - The platform user ID making the request (for headers).
 * @returns A ServiceResponse containing WebhookAgentMapping or an error.
 */
export const mapAgentToWebhook = async (
  data: MapAgentToWebhookRequest,
  platformUserId: string,
  platformApiKey: string,
  clientUserId: string
): Promise<ServiceResponse<MapAgentToWebhookRequest>> => {
  if (!platformUserId) {
    throw new Error('[api-client:mapAgentToWebhook] platformUserId is required for request header.');
  }
  if (!data || !data.agentId || !data.webhookProviderId || !data.clientUserId) {
    throw new Error('[api-client:mapAgentToWebhook] Input data must include agentId, webhookProviderId, and clientUserId.');
  }
  const endpoint = '/webhooks/map-agent';
  return makeAPIServiceRequest<MapAgentToWebhookRequest>(
    DATABASE_SERVICE_URL,
    'POST',
    endpoint,
    platformUserId,
    clientUserId,
    platformApiKey,
    data
  );
};

/**
 * Retrieves the agent mapping for a specific webhook provider and user.
 * 
 * Corresponds to: GET /webhooks/:webhookProviderId/agent
 * 
 * @param params - Path and query parameters (webhookProviderId, clientUserId).
 * @param platformUserId - The platform user ID making the request (for headers).
 * @returns A ServiceResponse containing WebhookAgentMapping or an error.
 */
export const getWebhookAgentMapping = async (
  params: GetWebhookAgentRequest,
  platformUserId: string,
  platformApiKey: string,
  clientUserId: string
): Promise<ServiceResponse<string>> => {
  if (!platformUserId) {
    throw new Error('[api-client:getWebhookAgentMapping] platformUserId is required for request header.');
  }
  if (!params || !params.webhookProviderId || !params.clientUserId) {
    throw new Error('[api-client:getWebhookAgentMapping] Parameters must include webhookProviderId and clientUserId.');
  }
  const endpoint = `/webhooks/${params.webhookProviderId}/agent`;
  // Pass clientUserId as query parameter
  const queryParams = { clientUserId: params.clientUserId }; 
  return makeAPIServiceRequest<string>(
    DATABASE_SERVICE_URL,
    'GET',
    endpoint,
    platformUserId,
    clientUserId,
    platformApiKey,
    undefined, // No body
    queryParams
  );
};

/**
 * Creates a webhook event record.
 * 
 * Corresponds to: POST /webhooks/events
 * 
 * @param data - Input data containing webhookProviderId, clientUserId, webhookEventPayload.
 * @param platformUserId - The platform user ID making the request (for headers).
 * @returns A ServiceResponse containing the created WebhookEvent object or an error.
 */
export const createWebhookEvent = async (
  data: CreateWebhookEventRequest,
  platformUserId: string,
  platformApiKey: string,
  clientUserId: string
): Promise<ServiceResponse<WebhookEvent>> => {
  if (!platformUserId) {
    throw new Error('[api-client:createWebhookEvent] platformUserId is required for request header.');
  }
  if (!data || !data.webhookProviderId || !data.clientUserId || !data.webhookEventPayload) {
    throw new Error('[api-client:createWebhookEvent] Input data must include webhookProviderId, clientUserId, and webhookEventPayload.');
  }
  const endpoint = '/webhooks/events';
  return makeAPIServiceRequest<WebhookEvent>(
    DATABASE_SERVICE_URL,
    'POST',
    endpoint,
    platformUserId,
    clientUserId,
    platformApiKey,
    data
  );
};

/**
 * Retrieves user IDs associated with a specific Crisp website ID.
 * 
 * Corresponds to: GET /webhooks/crisp/users/:website_id
 * 
 * @param params - Path parameters containing websiteId.
 * @param platformUserId - The platform user ID making the request (for headers).
 * @returns A ServiceResponse containing CrispUsersResponse (with userIds array) or an error.
 */
export const getCrispWebsiteUserIds = async (
  params: GetCrispUsersParams,
  platformUserId: string,
  platformApiKey: string,
  clientUserId: string
): Promise<ServiceResponse<CrispUsersResponse>> => {

  const endpoint = `/webhooks/crisp/users/${params.websiteId}`;
  return makeAPIServiceRequest<CrispUsersResponse>(
    DATABASE_SERVICE_URL,
    'GET',
    endpoint,
    platformUserId,
    clientUserId,
    platformApiKey,
    undefined, // No body
    undefined // No query params
  );
}; 