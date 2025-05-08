/**
 * Manual API Client for Webhook Store Service
 */
import {
    Webhook,
    ServiceResponse,
    PlatformUserApiServiceCredentials
} from '@agent-base/types';
import { makePlatformUserApiServiceRequest } from '../utils/service-client.js';
import { getApiGatewayServiceUrl } from '../utils/config.js';

/**
 * Fetches all webhook definitions created by the specified user via the API Gateway.
 * @param credentials - Internal service credentials containing platformApiKey, platformUserId, clientUserId.
 * @returns ServiceResponse containing an array of Webhooks or an error.
 */
export async function getUserCreatedWebhooks(
    externalApiServiceCredentials: PlatformUserApiServiceCredentials
): Promise<ServiceResponse<Webhook[]>> {

    return makePlatformUserApiServiceRequest<Webhook[]>(
        getApiGatewayServiceUrl(),
        'GET',
        '/webhook/get-user-created-webhooks',
        externalApiServiceCredentials,
        undefined,
        undefined
    );
}