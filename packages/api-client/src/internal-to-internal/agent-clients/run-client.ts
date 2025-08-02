/**
 * Client functions for interacting with the Agent Service for internal-to-internal communication.
 */
import { makeInternalStreamingRequest } from '../../utils/service-client.js';
import { getAgentServiceUrl } from '../../utils/config.js';
import { Message } from 'ai';
import { BaseMessage } from '@langchain/core/messages';
import { AgentInternalCredentials } from '@agent-base/types';

const AGENT_SERVICE_ROUTE_PREFIX = '/';

/**
 * Triggers the agent run process for a given conversation and message, for an internal service request, returning a stream.
 * This is the Vercel AI SDK compatible endpoint for internal service-to-service calls.
 * Corresponds to POST /run in Agent Service.
 *
 * @param conversationId - The ID of the conversation.
 * @param messages - The array of message objects to send to the agent.
 * @param credentials - The internal credentials for the agent.
 * @returns A promise resolving to the raw Response object for streaming.
 */
export const triggerAgentRunInternalServiceStream = async (
    conversationId: string,
    messages: Message[],
    credentials: AgentInternalCredentials
): Promise<Response> => {
    const AGENT_SERVICE_URL = getAgentServiceUrl();
    const endpoint = `${AGENT_SERVICE_ROUTE_PREFIX}run`;
    const body = { conversationId, messages };

    return makeInternalStreamingRequest(
        AGENT_SERVICE_URL,
        endpoint,
        body,
        credentials
    );
};

// /**
//  * Triggers the agent run process for a given conversation and message, for an internal service request, returning a stream.
//  * This is the LangGraph compatible endpoint for internal service-to-service calls.
//  * Corresponds to POST /run-langgraph in Agent Service.
//  *
//  * @param conversationId - The ID of the conversation.
//  * @param messages - The array of message objects to send to the agent.
//  * @param credentials - The internal credentials for the agent.
//  * @returns A promise resolving to the raw Response object for streaming.
//  */
// export const triggerAgentRunInternalServiceLangGraphStream = async (
//     conversationId: string,
//     messages: BaseMessage[],
//     credentials: AgentInternalCredentials
// ): Promise<Response> => {
//     const AGENT_SERVICE_URL = getAgentServiceUrl();
//     const endpoint = `${AGENT_SERVICE_ROUTE_PREFIX}run-langgraph`;
//     const body = { conversationId, messages };
// 
//     return makeInternalStreamingRequest(
//         AGENT_SERVICE_URL,
//         endpoint,
//         body,
//         credentials
//     );
// };
