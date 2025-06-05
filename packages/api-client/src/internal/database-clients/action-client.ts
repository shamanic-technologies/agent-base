/**
 * API Client for Database Service - Actions
 *
 * This file contains functions to interact with the action-related endpoints
 * of the database service. These are intended for internal use by other services
 * within the agent-base backend.
 */
import {
    Action,
    ServiceResponse,
} from '@agent-base/types';
import { makeInternalRequest } from '../../utils/service-client.js';
import { getDatabaseServiceUrl } from '../../utils/config.js';

/**
 * Fetches all actions for a given client user from the database service.
 * The clientUserId and clientOrganizationId are passed in headers by makeInternalRequest.
 *
 * @param clientUserId - The client user ID for whom to fetch actions (will be passed in x-client-user-id header).
 * @param clientOrganizationId - The client organization ID (will be passed in x-client-organization-id header).
 * @param platformUserId - The platform user ID for authentication/logging context.
 * @param platformApiKey - The platform API key for authentication/logging context.
 * @param limit - Optional. The maximum number of actions to retrieve.
 * @returns A promise that resolves to the service response containing an array of actions.
 */
export const getAllActionsForUserInternalApiService = async (
    clientUserId: string,
    clientOrganizationId: string,
    platformUserId: string,
    platformApiKey: string,
    limit?: number
): Promise<ServiceResponse<Action[]>> => {
    if (!clientUserId || !clientOrganizationId || !platformUserId || !platformApiKey) {
        // Consider returning a structured ServiceResponse for errors if preferred
        throw new Error(
            'Authentication details (clientUserId, clientOrganizationId, platformUserId, platformApiKey) are required.'
        );
    }

    const queryParams: Record<string, string> = {};
    if (typeof limit === 'number' && limit > 0) {
        queryParams.limit = String(limit);
    }

    return makeInternalRequest<Action[]>(
        getDatabaseServiceUrl(), // Base URL for the database service
        'GET',                   // HTTP method
        '/actions',              // Endpoint path
        platformUserId,          // For x-platform-user-id header (standard auth)
        clientUserId,            // For x-client-user-id header (specific to this endpoint's needs)
        clientOrganizationId,    // For x-client-organization-id header (specific to this endpoint's needs)
        platformApiKey,          // For x-platform-api-key header (standard auth)
        undefined,               // Request body (not needed for GET)
        Object.keys(queryParams).length > 0 ? queryParams : undefined // Pass queryParams if not empty
    );
}; 