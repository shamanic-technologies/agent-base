/**
 * API client for interacting with action-related endpoints of the Agent Service.
 */
import {
    Action,
    ServiceResponse,
} from '@agent-base/types';
import { makeInternalRequest } from '../../utils/service-client.js';
import { getAgentServiceUrl } from '../../utils/config.js';

/**
 * Fetches all actions for a given client user by calling the agent-service.
 * The agent-service, in turn, calls the database-service.
 * All necessary IDs for auth and context are passed in headers.
 *
 * @param clientUserId - The client user ID (for x-client-user-id header).
 * @param clientOrganizationId - The client organization ID (for x-client-organization-id header).
 * @param platformUserId - The platform user ID (for x-platform-user-id header).
 * @param platformApiKey - The platform API key (for x-platform-api-key header).
 * @param limit - Optional limit parameter for pagination
 * @returns A promise that resolves to a ServiceResponse containing an array of actions, as returned by agent-service.
 */
export async function getAllActionsForUserFromAgentService(
  clientUserId: string,
  clientOrganizationId: string,
  platformUserId: string,
  platformApiKey: string,
  limit?: number
): Promise<ServiceResponse<Action[]>> {
  if (!clientUserId || !clientOrganizationId || !platformUserId || !platformApiKey) {
    throw new Error(
      'ClientUser ID, ClientOrganization ID, PlatformUser ID, and PlatformAPIKey are required to fetch actions from agent service.'
    );
  }

  const queryParams: Record<string, string> = {};
  if (typeof limit === 'number' && limit > 0) {
      queryParams.limit = String(limit);
  }

  return makeInternalRequest<Action[]>(
    getAgentServiceUrl(),      
    'GET',                     
    '/actions',                
    platformUserId,            
    clientUserId,              
    clientOrganizationId,      
    platformApiKey,            
    undefined,                 
    Object.keys(queryParams).length > 0 ? queryParams : undefined // Pass queryParams if not empty
  );
} 