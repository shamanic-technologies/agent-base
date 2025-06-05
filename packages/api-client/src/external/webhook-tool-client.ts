/**
 * Manual API Client for Webhook Store Service
 */
import {
    Webhook,
    ServiceResponse,
    WebhookEvent,
    AgentBaseCredentials
} from '@agent-base/types';
import { makeAgentBaseRequest } from '../utils/service-client.js';
import { getAgentBaseApiUrl } from '../utils/config.js';

/**
 * Fetches all webhook definitions created by the specified user via the API Gateway.
 * @param credentials - Internal service credentials containing platformApiKey, platformUserId, clientUserId.
 * @returns ServiceResponse containing an array of Webhooks or an error.
 */
export async function getUserCreatedWebhooks(
    agentBaseCredentials: AgentBaseCredentials
): Promise<ServiceResponse<Webhook[]>> {

    return makeAgentBaseRequest<Webhook[]>(
        getAgentBaseApiUrl(),
        'GET',
        '/webhook/get-user-created-webhooks',
        agentBaseCredentials,
        undefined,
        undefined
    );
}

/**
 * Fetches all webhook definitions created by the specified user via the API Gateway.
 * @param credentials - Internal service credentials containing platformApiKey, platformUserId, clientUserId.
 * @returns ServiceResponse containing an array of Webhooks or an error.
 */
export async function getWebhookEvents(
    webhookId: string,
    agentBaseCredentials: AgentBaseCredentials,
): Promise<ServiceResponse<WebhookEvent[]>> {

    return makeAgentBaseRequest<WebhookEvent[]>(
        getAgentBaseApiUrl(),
        'GET',
        `/webhook/${webhookId}/events`,
        agentBaseCredentials,
        undefined,
        undefined
    );
}

