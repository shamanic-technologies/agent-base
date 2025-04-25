/**
 * Manual API Client for Webhook Store Service
 */
import { Method } from 'axios'; // Import Method type
import {
    WebhookData,
    Webhook,
    UserWebhook,
    SetupNeeded,
    WebhookAgentLink,
    ServiceResponse,
    InternalServiceCredentials 
} from '@agent-base/types';
import { makeInternalAPIServiceRequest } from './utils/service-client.js';
import { getWebhookStoreServiceUrl } from './utils/config.js';

// --- Define specific credential types needed by this client ---

// InternalServiceCredentials from @agent-base/types will be used for PlatformClientAuth

// --- API Wrapper Functions ---

/**
 * Creates a new webhook definition.
 * Note: Uses InternalAPIServiceRequest which expects clientUserId, but it's not needed/used by the endpoint.
 * @param baseUrl - Base URL of the webhook-store service.
 * @param data - Webhook definition data.
 * @param credentials - Platform authentication credentials.
 * @returns ServiceResponse containing the created Webhook or an error.
 */
export async function createWebhook(
    data: WebhookData,
    credentials: InternalServiceCredentials 
): Promise<ServiceResponse<Webhook>> {
    const { platformUserId, clientUserId, platformApiKey, agentId: credentialsAgentId } = credentials;
    return makeInternalAPIServiceRequest<Webhook>(
        getWebhookStoreServiceUrl(),
        'POST' as Method,
        '/webhooks',
        platformUserId, 
        clientUserId, 
        platformApiKey,
        data, // request body
        undefined, // params
        credentialsAgentId
    );
}

/**
 * Searches for webhook definitions.
 * Note: Uses InternalAPIServiceRequest which expects clientUserId, but it's not needed/used by the endpoint.
 * @param baseUrl - Base URL of the webhook-store service.
 * @param searchParams - Search query and limit.
 * @param credentials - Platform authentication credentials.
 * @returns ServiceResponse containing an array of Webhooks or an error.
 */
export async function searchWebhooks(
    searchParams: { query: string; limit?: number },
    credentials: InternalServiceCredentials
): Promise<ServiceResponse<Webhook[]>> {
    const { platformUserId, clientUserId, platformApiKey, agentId: credentialsAgentId } = credentials;
    return makeInternalAPIServiceRequest<Webhook[]>(
        getWebhookStoreServiceUrl(),
        'POST' as Method,
        '/webhooks/search',
        platformUserId,
        clientUserId,
        platformApiKey,
        searchParams, // request body
        undefined, // params
        credentialsAgentId
    );
}

/**
 * Links a webhook to a user, potentially returning setup instructions.
 * @param baseUrl - Base URL of the webhook-store service.
 * @param webhookId - ID of the webhook to link.
 * @param credentials - Internal service credentials containing platformApiKey, platformUserId, clientUserId.
 * @returns ServiceResponse containing the UserWebhook, WebhookSetupNeeded, or an error.
 */
export async function linkUserToWebhook(
    webhookId: string,
    credentials: InternalServiceCredentials
): Promise<ServiceResponse<UserWebhook | SetupNeeded>> {
    const { platformUserId, clientUserId, platformApiKey, agentId: credentialsAgentId } = credentials;
    return makeInternalAPIServiceRequest<UserWebhook | SetupNeeded>(
        getWebhookStoreServiceUrl(),
        'POST' as Method,
        `/webhooks/${webhookId}/link-user`,
        platformUserId,
        clientUserId,
        platformApiKey,
        {}, // No request body
        undefined, // params
        credentialsAgentId
    );
}

/**
 * Links an agent to an active user-webhook link.
 * @param baseUrl - Base URL of the webhook-store service.
 * @param webhookId - ID of the webhook.
 * @param agentData - Object containing the agentId.
 * @param credentials - Internal service credentials containing platformApiKey, platformUserId, clientUserId.
 * @returns ServiceResponse containing the WebhookAgentLink or an error.
 */
export async function linkAgentToWebhook(
    webhookId: string,
    agentId: string,
    credentials: InternalServiceCredentials
): Promise<ServiceResponse<WebhookAgentLink>> {
    const { platformUserId, clientUserId, platformApiKey, agentId: credentialsAgentId } = credentials;
    return makeInternalAPIServiceRequest<WebhookAgentLink>(
        getWebhookStoreServiceUrl(),
        'POST' as Method,
        `/webhooks/${webhookId}/link-agent`,
        platformUserId,
        clientUserId,
        platformApiKey,
        { agentId }, // request body
        undefined, // params
        credentialsAgentId
    );
} 