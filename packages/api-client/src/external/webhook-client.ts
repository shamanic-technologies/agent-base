/**
 * Manual API Client for Webhook Store Service
 */
import {
    Webhook,
    ServiceResponse,
    PlatformUserApiServiceCredentials,
    WebhookEvent
} from '@agent-base/types';
import { makePlatformUserApiServiceRequest } from '../utils/service-client.js';
import { getAgentBaseApiUrl } from '../utils/config.js';

/**
 * Fetches all webhook definitions created by the specified user via the API Gateway.
 * @param credentials - Internal service credentials containing platformApiKey, platformUserId, clientUserId.
 * @returns ServiceResponse containing an array of Webhooks or an error.
 */
export async function getUserCreatedWebhooks(
    externalApiServiceCredentials: PlatformUserApiServiceCredentials
): Promise<ServiceResponse<Webhook[]>> {

    return makePlatformUserApiServiceRequest<Webhook[]>(
        getAgentBaseApiUrl(),
        'GET',
        '/webhook/get-user-created-webhooks',
        externalApiServiceCredentials,
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
    externalApiServiceCredentials: PlatformUserApiServiceCredentials,
): Promise<ServiceResponse<WebhookEvent[]>> {

    return makePlatformUserApiServiceRequest<WebhookEvent[]>(
        getAgentBaseApiUrl(),
        'GET',
        `/webhook/${webhookId}/events`,
        externalApiServiceCredentials,
        undefined,
        undefined
    );
}