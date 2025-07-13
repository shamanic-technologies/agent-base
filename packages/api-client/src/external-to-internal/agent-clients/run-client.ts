/**
 * Client functions for interacting with the Agent Service.
 */
import { ServiceResponse, AgentBaseCredentials, MinimalInternalCredentials } from '@agent-base/types'; // Assuming Agent type exists
import { makeMinimalInternalRequest, makeStreamingAgentRequest } from '../../utils/service-client.js';
import { getAgentBaseApiUrl } from '../../utils/config.js';
import { Message } from 'ai';
import { BaseMessage } from '@langchain/core/messages';

const AGENT_SERVICE_ROUTE_PREFIX = '/agent';

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
 * This is the Vercel AI SDK compatible endpoint.
 * Corresponds to POST /agent/run in API Gateway, expecting a stream response.
 * 
 * @param conversationId - The ID of the conversation.
 * @param messages - The array of message objects to send to the agent.
 * @param platformUserApiServiceCredentials - Credentials containing platformClientUserId and platformApiKey.
 * @returns A promise resolving to the raw Response object for streaming.
 */
export const triggerAgentRunPlatformUserApiServiceStream = async (
    conversationId: string,
    messages: Message[],
    agentBaseCredentials: AgentBaseCredentials
): Promise<Response> => {
    const AGENT_BASE_API_URL = getAgentBaseApiUrl();
    const endpoint = `${AGENT_SERVICE_ROUTE_PREFIX}/run`;
    const body = { conversationId, messages };
    return makeStreamingAgentRequest(AGENT_BASE_API_URL, endpoint, body, agentBaseCredentials);
};

/**
 * Triggers a LangGraph agent run, returning a stream.
 * Intended for clients like the WhatsApp service.
 * Corresponds to POST /agent/run/langgraph in API Gateway.
 * 
 * @param message - The user's message string.
 * @param from - The identifier for the user (e.g., WhatsApp phone number).
 * @param agentBaseCredentials - Credentials for authentication.
 * @returns A promise resolving to the raw Response object for streaming.
 */
export const triggerLangGraphAgentRunStream = async (
    conversationId: string,
    messages: BaseMessage[],
    agentBaseCredentials: AgentBaseCredentials
): Promise<Response> => {
    const AGENT_BASE_API_URL = getAgentBaseApiUrl();
    const endpoint = `${AGENT_SERVICE_ROUTE_PREFIX}/run/langgraph`;
    const body = { conversationId, messages };
    return makeStreamingAgentRequest(AGENT_BASE_API_URL, endpoint, body, agentBaseCredentials);
}; 


