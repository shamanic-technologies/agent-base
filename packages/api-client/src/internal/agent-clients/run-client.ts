/**
 * Manual API Client for Agent Service
 */
import { Method } from 'axios';
import {
    ServiceResponse,
    InternalServiceCredentials, // Use this type which includes platformApiKey
} from '@agent-base/types';
//@ts-ignore
import { Message } from 'ai';
import { makeInternalAPIServiceRequest } from '../../utils/service-client.js';
import { getAgentServiceUrl } from '../../utils/config.js'; // Assuming this function exists or will be created

/**
 * Triggers the agent run process for a given conversation and message.
 * Does not handle the streamed response.
 * @param conversationId - The ID of the conversation.
 * @param message - The message object to send to the agent.
 * @param auth - Authentication credentials including platformUserId, clientUserId, platformApiKey.
 * @returns ServiceResponse indicating success or failure of triggering the run. Expects a simple acknowledgement, not the stream data.
 */
export async function triggerAgentRun(
    conversationId: string,
    message: Message,
    auth: InternalServiceCredentials 
): Promise<ServiceResponse<void>> { // Returns void as we don't process the stream here
    const { platformUserId, clientUserId, platformApiKey } = auth;
    
    // The agent run endpoint internally uses headers, but makeInternalAPIServiceRequest
    // puts these specific IDs into headers automatically.
    // The body requires conversationId and message.
    // We pass undefined for agentId here as it's determined within the agent service itself.
    return makeInternalAPIServiceRequest<void>(
        getAgentServiceUrl(), // Get the base URL for the agent service
        'POST' as Method,
        '/run', // Assuming the router is mounted at /run
        platformUserId, 
        clientUserId, 
        platformApiKey,
        { conversationId, message }, // Request body
        undefined, // params
        undefined // agentId - not needed directly for this call signature
    );
} 