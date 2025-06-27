import {
    ServiceResponse,
    AgentBaseCredentials,
    ApiKey
} from '@agent-base/types';
import { makeAgentBaseRequest } from '../utils/service-client.js';
import { getAgentBaseApiUrl } from '../utils/config.js';

/**
 * Deletes an API key.
 * @param agentBaseCredentials - Credentials for authentication.
 * @param keyId - The ID of the key to delete.
 * @returns ServiceResponse containing a success boolean or an error.
 */
export async function deleteApiKey(
    agentBaseCredentials: AgentBaseCredentials,
    keyId: string
): Promise<ServiceResponse<boolean>> {
    return makeAgentBaseRequest<boolean>(
        getAgentBaseApiUrl(),
        'DELETE',
        `/key/${keyId}`,
        agentBaseCredentials
    );
}
