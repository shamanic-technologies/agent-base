/**
 * Client functions for interacting with the Agent Service.
 */
import { ServiceResponse, ClientUserApiServiceCredentials } from '@agent-base/types'; // Assuming Agent type exists
import { makeClientUserApiServiceRequest } from '../../utils/service-client.js';
import { getAgentBaseApiUrl } from '../../utils/config.js';
import { Message } from 'ai';

const AGENT_SERVICE_ROUTE_PREFIX = '/agent'; // Assuming API Gateway prefixes agent routes with /agent
const AGENT_BASE_API_URL = getAgentBaseApiUrl();

/**
 * Triggers the agent run process for a given conversation and message.
 * Corresponds to POST /agent/run in API Gateway
 * 
 * @param conversationId - The ID of the conversation.
 * @param message - The message object to send to the agent.
 * @param clientUserApiServiceCredentials - Credentials containing clientUserId and clientApiKey.
 * @returns A promise resolving to the ServiceResponse containing the ID of the created conversation.
 */
export const triggerAgentRunClientUserApiService = async (
    conversationId: string,
    message: Message,
    clientUserApiServiceCredentials: ClientUserApiServiceCredentials
): Promise<ServiceResponse<void>> => { // Returns void as we don't process the stream here
    const endpoint = `${AGENT_SERVICE_ROUTE_PREFIX}/run`;    
    return makeClientUserApiServiceRequest<void>( 
        AGENT_BASE_API_URL,
        'POST',
        endpoint,
        clientUserApiServiceCredentials,
        { conversationId, message }, // Pass body here
        undefined // No query params for POST
    );
};


