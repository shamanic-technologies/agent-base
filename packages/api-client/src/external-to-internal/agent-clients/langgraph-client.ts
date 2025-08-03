/**
 * Client functions for interacting with the Agent Service's LangGraph routes.
 */
import { AgentBaseCredentials } from '@agent-base/types';
import { makeStreamingAgentRequest } from '../../utils/service-client.js';
import { getAgentBaseApiUrl } from '../../utils/config.js';
import { Message } from 'ai';

const LANGGRAPH_ROUTE_PREFIX = '/langgraph';

/**
 * Triggers a LangGraph agent run via the agent-service, returning a stream.
 * This is the primary entry point for frontends to start a LangGraph conversation.
 * Corresponds to POST /langgraph in Agent Service, which is proxied via the API Gateway.
 * 
 * @param conversationId - The ID of the conversation to run.
 * @param messages - The history of messages to provide to the agent.
 * @param agentBaseCredentials - Credentials for authenticating the request via the API Gateway.
 * @returns A promise resolving to the raw Response object for streaming.
 */
export const triggerLangGraphRunStream = async (
    conversationId: string,
    messages: Message[],
    agentBaseCredentials: AgentBaseCredentials
): Promise<Response> => {
    const AGENT_BASE_API_URL = getAgentBaseApiUrl();
    const endpoint = `${LANGGRAPH_ROUTE_PREFIX}`; // Updated endpoint
    const body = { conversationId, messages }; // Added messages to body

    return makeStreamingAgentRequest(
        AGENT_BASE_API_URL,
        endpoint,
        body,
        agentBaseCredentials
    );
};
