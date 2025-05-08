/**
 * API Client functions for interacting with the Agent Service conversation endpoints VIA THE API GATEWAY.
 */
import { 
    ServiceResponse, 
    Conversation, 
    CreateConversationInput, 
    ConversationId,
    InternalServiceCredentials,
    PlatformUserApiServiceCredentials, // Import credentials type
    ConversationRecord,
} from '@agent-base/types';
//@ts-ignore
import { Message } from 'ai'; // Import Message from 'ai'
import { makePlatformUserApiServiceRequest, makeInternalAPIServiceRequest } from '../../utils/service-client.js'; // Added .js
import { getAgentServiceUrl, getApiGatewayServiceUrl } from '../../utils/config.js'; // Added .js
import { Method } from 'axios';

const API_GATEWAY_URL = getApiGatewayServiceUrl();
const AGENT_SERVICE_ROUTE_PREFIX = '/agent'; // Assuming API Gateway prefixes agent routes with /agent

/**
 * Creates a new conversation record via the API Gateway.
 * Corresponds to POST /agent/conversations/create-conversation in API Gateway
 * 
 * @param body - The input data for creating the conversation (agentId, channelId, conversationId).
 * @param internalApiServiceCredentials - Credentials containing platformClientUserId and platformApiKey.
 * @returns A promise resolving to the ServiceResponse containing the ID of the created conversation.
 */
export const getOrCreateConversationInternalApiService = async (
    body: CreateConversationInput,
    internalServiceCredentials: InternalServiceCredentials
): Promise<ServiceResponse<ConversationId>> => {
    const { platformUserId, clientUserId, platformApiKey } = internalServiceCredentials;
    const endpoint = `/conversation/get-or-create-conversation`;
    
    return makeInternalAPIServiceRequest<ConversationId>( 
        getAgentServiceUrl(),
        'POST',
        endpoint,
        platformUserId, // Required
        clientUserId,   // Required
        platformApiKey, // Required
        body,
        undefined,
        undefined
    );
};

