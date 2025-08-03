/**
 * Client functions for interacting with the Agent Service's LangGraph routes.
 * This client acts as a pass-through to the langgraph proxy endpoint.
 */
import { AgentBaseCredentials } from '@agent-base/types';
import { getAgentBaseApiUrl } from '../utils/config.js';
import { Method } from 'axios';

const LANGGRAPH_ROUTE_PREFIX = '/langgraph';

/**
 * Proxies a request to the agent-service's /langgraph/[...slug] endpoint.
 * This is the primary entry point for the frontend's useStream hook to communicate
 * with the backend, handling various sub-paths like /threads, /runs, etc.
 * 
 * @param slug - The array of path segments to append to the base endpoint.
 * @param method - The HTTP method for the request (e.g., 'GET', 'POST').
 * @param body - The JSON body for the request.
 * @param agentBaseCredentials - Credentials for authenticating the request via the API Gateway.
 * @returns A promise resolving to the raw Response object for streaming.
 */
export const proxyLangGraphRequest = async (
    slug: string[],
    method: Method,
    body: any,
    agentBaseCredentials: AgentBaseCredentials
): Promise<Response> => {
    const AGENT_BASE_API_URL = getAgentBaseApiUrl();
    const slugPath = slug.join('/');
    const endpoint = `${LANGGRAPH_ROUTE_PREFIX}/${slugPath}`;
    const fullUrl = `${AGENT_BASE_API_URL}${endpoint}`;

    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'x-client-auth-user-id': agentBaseCredentials.clientAuthUserId,
        'x-client-auth-organization-id': agentBaseCredentials.clientAuthOrganizationId,
        'x-platform-api-key': agentBaseCredentials.platformApiKey,
    };

    const response = await fetch(fullUrl, {
        method: method,
        headers,
        body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[langgraph-client] Error proxying request to ${endpoint}: ${response.status} ${errorText}`);
        throw new Error(`Failed to proxy request to LangGraph service: ${errorText}`);
    }

    return response;
};
