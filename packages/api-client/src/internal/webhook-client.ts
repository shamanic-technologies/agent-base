/**
 * Manual API Client for Webhook Store Service
 */
import { Method } from 'axios'; // Import Method type
import {
    WebhookData,
    Webhook,
    UserWebhook,
    SetupNeeded,
    CreateAgentUserWebhookRequest,
    ServiceResponse,
    InternalServiceCredentials,

} from '@agent-base/types';
import { makeExternalApiServiceRequest, makeInternalAPIServiceRequest } from '../utils/service-client.js';
import { getApiGatewayServiceUrl, getWebhookToolApiUrl } from '../utils/config.js';

// --- Define specific credential types needed by this client ---

// InternalServiceCredentials from @agent-base/types will be used for PlatformClientAuth

// --- API Wrapper Functions ---

/**
 * Creates a new webhook definition via the API Gateway.
 * Note: Uses InternalAPIServiceRequest which expects clientUserId, but it's not needed/used by the endpoint.
 * @param data - Webhook definition data.
 * @param credentials - Platform authentication credentials.
 * @returns ServiceResponse containing the created Webhook or an error.
 */
export async function createWebhookInternalApiService(
    data: WebhookData,
    credentials: InternalServiceCredentials 
): Promise<ServiceResponse<Webhook>> {
    const { platformUserId, clientUserId, platformApiKey, agentId: credentialsAgentId } = credentials;
    return makeInternalAPIServiceRequest<Webhook>(
        getApiGatewayServiceUrl(),
        'POST' as Method,
        '/webhook/',
        platformUserId, 
        clientUserId, 
        platformApiKey,
        data,
        undefined,
        credentialsAgentId
    );
}

/**
 * Searches for webhook definitions via the API Gateway.
 * Note: Uses InternalAPIServiceRequest which expects clientUserId, but it's not needed/used by the endpoint.
 * @param searchParams - Search query and limit.
 * @param credentials - Platform authentication credentials.
 * @returns ServiceResponse containing an array of Webhooks or an error.
 */
export async function searchWebhooksInternalApiService(
    searchParams: { query: string; limit?: number },
    credentials: InternalServiceCredentials
): Promise<ServiceResponse<Webhook[]>> {
    const { platformUserId, clientUserId, platformApiKey, agentId: credentialsAgentId } = credentials;
    return makeInternalAPIServiceRequest<Webhook[]>(
        getApiGatewayServiceUrl(),
        'POST' as Method,
        '/webhook/search',
        platformUserId,
        clientUserId,
        platformApiKey,
        searchParams,
        undefined,
        credentialsAgentId
    );
}

/**
 * Links a webhook to a user via the API Gateway, potentially returning setup instructions.
 * @param webhookId - ID of the webhook to link.
 * @param credentials - Internal service credentials containing platformApiKey, platformUserId, clientUserId.
 * @returns ServiceResponse containing the UserWebhook, WebhookSetupNeeded, or an error.
 */
export async function linkUserToWebhookInternalApiService(
    webhookId: string,
    credentials: InternalServiceCredentials
): Promise<ServiceResponse<UserWebhook | SetupNeeded>> {
    const { platformUserId, clientUserId, platformApiKey, agentId: credentialsAgentId } = credentials;
    return makeInternalAPIServiceRequest<UserWebhook | SetupNeeded>(
        getApiGatewayServiceUrl(),
        'POST' as Method,
        `/webhook/${webhookId}/link-user`,
        platformUserId,
        clientUserId,
        platformApiKey,
        {},
        undefined,
        credentialsAgentId
    );
}

/**
 * Links an agent to an active user-webhook link via the API Gateway.
 * @param webhookId - ID of the webhook.
 * @param agentId - ID of the agent to link.
 * @param credentials - Internal service credentials containing platformApiKey, platformUserId, clientUserId.
 * @returns ServiceResponse containing the WebhookAgentLink or an error.
 */
export async function linkAgentToWebhookInternalApiService(
    webhookId: string,
    agentId: string,
    credentials: InternalServiceCredentials
): Promise<ServiceResponse<CreateAgentUserWebhookRequest>> {
    const { platformUserId, clientUserId, platformApiKey, agentId: credentialsAgentId } = credentials;
    return makeInternalAPIServiceRequest<CreateAgentUserWebhookRequest>(
        getApiGatewayServiceUrl(),
        'POST' as Method,
        `/webhook/${webhookId}/link-agent`,
        platformUserId,
        clientUserId,
        platformApiKey,
        { agentId },
        undefined,
        credentialsAgentId
    );
}

/**
 * Fetches all webhook definitions created by the specified user via the API Gateway.
 * @param credentials - Internal service credentials containing platformApiKey, platformUserId, clientUserId.
 * @returns ServiceResponse containing an array of Webhooks or an error.
 */
export async function getUserCreatedWebhooksInternalApiService(
    credentials: InternalServiceCredentials
): Promise<ServiceResponse<Webhook[]>> {
    const { platformUserId, clientUserId, platformApiKey, agentId: credentialsAgentId } = credentials;
    if (!clientUserId) {
        return { success: false, error: 'Client Error', details: 'clientUserId is required for getUserCreatedWebhooks.' };
    }
    return makeInternalAPIServiceRequest<Webhook[]>(
        getApiGatewayServiceUrl(),
        'POST' as Method,
        '/webhook/get-user-created-webhooks',
        platformUserId,
        clientUserId,
        platformApiKey,
        {},
        undefined,
        credentialsAgentId
    );
} 