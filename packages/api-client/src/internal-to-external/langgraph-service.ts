/**
 * API Client for the self-hosted LangGraph Service.
 * Treats the LangGraph service as an external entity with a distinct API contract.
 */
import { getLangGraphServiceUrl } from '../utils/config.js';
import { AgentBaseCredentials } from '@agent-base/types';

/**
 * Calls the self-hosted LangGraph service to execute an agent run and returns a stream.
 * This function communicates directly with the LangGraph service's API endpoint.
 *
 * @param conversationId - The ID of the conversation thread, which the graph will use to fetch state.
 * @param agentBaseCredentials - The credentials required for the graph to make authenticated internal API calls.
 * @returns A promise resolving to the raw Response object for streaming.
 */
export const callLangGraphService = async (
    conversationId: string,
    agentBaseCredentials: AgentBaseCredentials,
): Promise<Response> => {
    const LANGGRAPH_SERVICE_URL = getLangGraphServiceUrl();
    
    const url = `${LANGGRAPH_SERVICE_URL}/threads/${conversationId}/runs/stream`;

    const body = {
        // Input is now minimal, as the graph is responsible for fetching its own state.
        input: null, 
        configurable: {
            // Pass the credentials so the graph nodes can make authenticated calls
            // to other internal services (e.g., to get agent details or messages).
            ...agentBaseCredentials
        }
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[langgraph-client] Error calling LangGraph service: ${response.status} ${errorText}`);
        throw new Error(`Failed to call LangGraph service: ${errorText}`);
    }

    return response;
};
