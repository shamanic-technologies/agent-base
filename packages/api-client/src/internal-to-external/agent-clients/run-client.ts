/**
 * Client functions for interacting with the Agent Service.
 */
import { ServiceResponse, AgentBaseCredentials, MinimalInternalCredentials } from '@agent-base/types'; // Assuming Agent type exists
import { makeMinimalInternalRequest } from '../../utils/service-client.js';
import { getAgentBaseApiUrl } from '../../utils/config.js';
import { Message } from 'ai';

const AGENT_SERVICE_ROUTE_PREFIX = '/agent'; // Assuming API Gateway prefixes agent routes with /agent

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
    minimalInternalCredentials: MinimalInternalCredentials
): Promise<ServiceResponse<void>> => { // Returns void as we don't process the stream here
    const AGENT_BASE_API_URL = getAgentBaseApiUrl(); // Call getAgentBaseApiUrl here
    const endpoint = `${AGENT_SERVICE_ROUTE_PREFIX}/run`;    
    return makeMinimalInternalRequest<void>( 
        AGENT_BASE_API_URL,
        'POST',
        endpoint,
        minimalInternalCredentials,
        { conversationId, message }, // Pass body here
        undefined // No query params for POST
    );
};

/**
 * Triggers the agent run process for a given conversation and message FOR A PLATFORM USER, returning a stream.
 * Inspired by callAgentServiceStream.
 * Corresponds to POST /agent/run in API Gateway, expecting a stream response.
 * 
 * @param conversationId - The ID of the conversation.
 * @param message - The message object to send to the agent.
 * @param platformUserApiServiceCredentials - Credentials containing platformClientUserId and platformApiKey.
 * @returns A promise resolving to the raw Response object for streaming.
 */
export const triggerAgentRunPlatformUserApiServiceStream = async (
    conversationId: string,
    message: Message,
    agentBaseCredentials: AgentBaseCredentials
): Promise<Response> => {
    const AGENT_BASE_API_URL = getAgentBaseApiUrl();
    const endpoint = `${AGENT_SERVICE_ROUTE_PREFIX}/run`;
    const body = { conversationId, message };

    try {
        const response = await fetch(`${AGENT_BASE_API_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-client-auth-user-id': agentBaseCredentials.clientAuthUserId,
                'x-client-auth-organization-id': agentBaseCredentials.clientAuthOrganizationId,
                'x-platform-api-key': agentBaseCredentials.platformApiKey,
                'Accept': 'text/event-stream'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            let errorBody: any = null;
            let errorText: string = 'Unknown agent service error during stream initiation';
            let parsedError: string | null = null;
            let parsedDetails: any = null;

            try {
                errorText = await response.text();
                try {
                    errorBody = JSON.parse(errorText);
                    parsedError = errorBody?.error || errorBody?.message; 
                    parsedDetails = errorBody?.details;
                } catch (parseError) {
                    // console.warn('Failed to parse error response body as JSON:', parseError);
                }
            } catch (readError) {
                // console.error('Failed to read error response body:', readError);
            }

            // console.error('Agent service stream error received:', errorText);

            const errorToThrow = {
                status: response.status,
                code: 'AGENT_STREAM_ERROR',
                message: parsedError || `Agent service stream error: ${errorText}`,
                details: parsedDetails || 'There was an issue initiating the agent service stream'
            };
            throw errorToThrow;
        }

        if (!response.body) {
            throw {
                status: 500,
                code: 'EMPTY_STREAM_RESPONSE',
                message: 'Empty response body from agent service stream',
                details: 'The agent service returned an empty response body for the stream.'
            };
        }

        return response; // Return the raw response for the caller to handle the stream

    } catch (error: any) {
        if (error && typeof error === 'object' && 'status' in error && 'code' in error) {
            throw error; // Re-throw custom structured error
        }
        // console.error('Fetch error during agent service stream initiation:', error);
        throw {
            status: 503, // Service Unavailable or connection error
            code: 'AGENT_STREAM_CONNECTION_ERROR',
            message: 'Failed to connect to agent service for streaming',
            details: error.message || 'Could not establish connection to the agent service for streaming.'
        };
    }
}; 


