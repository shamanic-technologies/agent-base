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
    HumanInternalCredentials,
    WebhookEvent
} from '@agent-base/types';
import { makeInternalRequest } from '../utils/service-client.js';
import { getAgentBaseApiUrl, getApiGatewayServiceUrl } from '../utils/config.js';

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
    credentials: HumanInternalCredentials 
): Promise<ServiceResponse<Webhook>> {
    const { platformUserId, clientUserId, clientOrganizationId, platformApiKey, agentId: credentialsAgentId } = credentials;
    return makeInternalRequest<Webhook>(
        getApiGatewayServiceUrl(),
        'POST' as Method,
        '/webhook/',
        platformUserId, 
        clientUserId, 
        clientOrganizationId,
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
    credentials: HumanInternalCredentials
): Promise<ServiceResponse<Webhook[]>> {
    const { platformUserId, clientUserId, clientOrganizationId, platformApiKey, agentId: credentialsAgentId } = credentials;
    return makeInternalRequest<Webhook[]>(
        getApiGatewayServiceUrl(),
        'POST' as Method,
        '/webhook/search',
        platformUserId,
        clientUserId,
        clientOrganizationId,
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
    credentials: HumanInternalCredentials
): Promise<ServiceResponse<UserWebhook | SetupNeeded>> {
    const { platformUserId, clientUserId, clientOrganizationId, platformApiKey, agentId: credentialsAgentId } = credentials;
    return makeInternalRequest<UserWebhook | SetupNeeded>(
        getApiGatewayServiceUrl(),
        'POST' as Method,
        `/webhook/${webhookId}/link-user`,
        platformUserId,
        clientUserId,
        clientOrganizationId,
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
    credentials: HumanInternalCredentials
): Promise<ServiceResponse<CreateAgentUserWebhookRequest>> {
    const { platformUserId, clientUserId, clientOrganizationId, platformApiKey, agentId: credentialsAgentId } = credentials;
    return makeInternalRequest<CreateAgentUserWebhookRequest>(
        getApiGatewayServiceUrl(),
        'POST' as Method,
        `/webhook/${webhookId}/link-agent`,
        platformUserId,
        clientUserId,
        clientOrganizationId,
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
    credentials: HumanInternalCredentials
): Promise<ServiceResponse<Webhook[]>> {
    const { platformUserId, clientUserId, clientOrganizationId, platformApiKey, agentId: credentialsAgentId } = credentials;
    if (!clientUserId) {
        return { success: false, error: 'Client Error', details: 'clientUserId is required for getUserCreatedWebhooks.' };
    }
    return makeInternalRequest<Webhook[]>(
        getApiGatewayServiceUrl(),
        'GET' as Method,
        '/webhook/get-user-created-webhooks',
        platformUserId,
        clientUserId,
        clientOrganizationId,
        platformApiKey,
        undefined,
        undefined,
        credentialsAgentId
    );
}

/**
 * Fetches the N latest webhook events for the authenticated user/organization.
 * @param humanInternalCredentials - Credentials for authentication.
 * @param limit - Optional number of events to fetch. Defaults to a server-side value if not provided.
 * @returns ServiceResponse containing an array of WebhookEvents or an error.
 */
export async function getLatestWebhookEvents(
    humanInternalCredentials: HumanInternalCredentials,
    limit?: number
): Promise<ServiceResponse<WebhookEvent[]>> {
    
    let queryParams: Record<string, string> | undefined = undefined;
    if (limit !== undefined) {
        queryParams = { limit: limit.toString() };
    }
    const { platformUserId, clientUserId, clientOrganizationId, platformApiKey, agentId: credentialsAgentId } = humanInternalCredentials;

    return makeInternalRequest<WebhookEvent[]>(
        getApiGatewayServiceUrl(),
        'GET',
        '/webhook/events/latest', // The new endpoint path
        platformUserId,
        clientUserId,
        clientOrganizationId,
        platformApiKey,
        undefined, // No request body for GET
        queryParams, // Pass the limit as a query parameter
        credentialsAgentId
    );
}

/**
 * Renames a webhook definition via the API Gateway.
 * @param webhookId - ID of the webhook to rename.
 * @param newName - The new name for the webhook.
 * @param credentials - Platform authentication credentials.
 * @returns ServiceResponse containing the updated Webhook or an error.
 */
export async function renameWebhookInternalApiService(
    webhookId: string,
    newName: string,
    credentials: HumanInternalCredentials
): Promise<ServiceResponse<Webhook>> {
    const { platformUserId, clientUserId, clientOrganizationId, platformApiKey, agentId: credentialsAgentId } = credentials;
    return makeInternalRequest<Webhook>(
        getApiGatewayServiceUrl(),
        'PATCH' as Method,
        `/webhook/${webhookId}/rename`,
        platformUserId,
        clientUserId,
        clientOrganizationId,
        platformApiKey,
        { name: newName },
        undefined,
        credentialsAgentId
    );
}

/**
 * Deletes a webhook definition via the API Gateway.
 * @param webhookId - ID of the webhook to delete.
 * @param credentials - Platform authentication credentials.
 * @returns ServiceResponse indicating success or an error.
 */
export async function deleteWebhookInternalApiService(
    webhookId: string,
    credentials: HumanInternalCredentials
): Promise<ServiceResponse<void>> {
    const { platformUserId, clientUserId, clientOrganizationId, platformApiKey, agentId: credentialsAgentId } = credentials;
    return makeInternalRequest<void>(
        getApiGatewayServiceUrl(),
        'DELETE' as Method,
        `/webhook/${webhookId}`,
        platformUserId,
        clientUserId,
        clientOrganizationId,
        platformApiKey,
        undefined,
        undefined,
        credentialsAgentId
    );
}

/**
 * Updates a webhook definition via the API Gateway.
 * @param webhookId - ID of the webhook to update.
 * @param updates - The data to update.
 * @param credentials - Platform authentication credentials.
 * @returns ServiceResponse containing the updated Webhook or an error.
 */
export async function updateWebhookInternalApiService(
    webhookId: string,
    updates: Partial<WebhookData>,
    credentials: HumanInternalCredentials
): Promise<ServiceResponse<Webhook>> {
    const { platformUserId, clientUserId, clientOrganizationId, platformApiKey, agentId: credentialsAgentId } = credentials;
    return makeInternalRequest<Webhook>(
        getApiGatewayServiceUrl(),
        'PUT' as Method,
        `/webhook/${webhookId}`,
        platformUserId,
        clientUserId,
        clientOrganizationId,
        platformApiKey,
        updates,
        undefined,
        credentialsAgentId
    );
}