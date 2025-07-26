/**
 * API Client functions for interacting with the Agent Service LangGraph conversation endpoints VIA THE API GATEWAY.
 */
import { 
    ServiceResponse, 
    ConversationLanggraph, 
    CreateConversationInput, 
    AgentBaseCredentials,
    MinimalInternalCredentials,
} from '@agent-base/types';
import { makeAgentBaseRequest, makeMinimalInternalRequest } from '../../utils/service-client.js';
import { getAgentBaseApiUrl } from '../../utils/config.js';

const AGENT_SERVICE_ROUTE_PREFIX = '/agent';

/**
 * Fetches LangGraph conversations for a specific agent via API Gateway, creating one if none exist.
 */
export const getOrCreateConversationsLangGraphPlatformUserApiService = async (
    params: { agentId: string }, 
    agentBaseCredentials: AgentBaseCredentials
): Promise<ServiceResponse<ConversationLanggraph[]>> => {
    const AGENT_BASE_API_URL = getAgentBaseApiUrl();
    const { agentId } = params;
    const endpoint = `${AGENT_SERVICE_ROUTE_PREFIX}/conversation-langgraph/get-or-create-conversations-from-agent-langgraph`;
    const queryParams = { agentId }; 

    return makeAgentBaseRequest<ConversationLanggraph[]>( 
        AGENT_BASE_API_URL,
        'GET',
        endpoint,
        agentBaseCredentials,
        undefined,
        queryParams
    );
};


/**
 * Creates a new LangGraph conversation record via the API Gateway.
 */
export const createConversationLangGraphExternalApiService = async (
    body: CreateConversationInput,
    agentBaseCredentials: AgentBaseCredentials
): Promise<ServiceResponse<ConversationLanggraph>> => {
    const AGENT_BASE_API_URL = getAgentBaseApiUrl();
    const endpoint = `${AGENT_SERVICE_ROUTE_PREFIX}/conversation-langgraph/create-conversation-langgraph`;    
    return makeAgentBaseRequest<ConversationLanggraph>( 
        AGENT_BASE_API_URL,
        'POST',
        endpoint,
        agentBaseCredentials,
        body,
        undefined
    );
};

/**
 * Gets or creates a LangGraph conversation record via the API Gateway.
 */
export const getOrCreateConversationLangGraphClientUserApiService = async (
    body: CreateConversationInput,
    minimalInternalCredentials: MinimalInternalCredentials
): Promise<ServiceResponse<ConversationLanggraph>> => {
    const AGENT_BASE_API_URL = getAgentBaseApiUrl();
    const endpoint = `${AGENT_SERVICE_ROUTE_PREFIX}/conversation-langgraph/get-or-create-conversation-langgraph`;    
    return makeMinimalInternalRequest<ConversationLanggraph>( 
        AGENT_BASE_API_URL,
        'POST',
        endpoint,
        minimalInternalCredentials,
        body,
        undefined
    );
};

/**
 * Fetches all LangGraph conversations for the authenticated client user via the API Gateway.
 */
export const getAllClientUserConversationsLangGraphApiService = async (
    agentBaseCredentials: AgentBaseCredentials
): Promise<ServiceResponse<ConversationLanggraph[]>> => {
    const AGENT_BASE_API_URL = getAgentBaseApiUrl();
    const endpoint = `${AGENT_SERVICE_ROUTE_PREFIX}/conversation-langgraph/get-all-user-conversations-langgraph`;

    return makeAgentBaseRequest<ConversationLanggraph[]>(
        AGENT_BASE_API_URL,
        'GET',
        endpoint,
        agentBaseCredentials,
        undefined,
        undefined
    );
};

/**
 * Fetches all LangGraph conversations for the authenticated platform user via the API Gateway.
 */
export const getAllPlatformUserConversationsLangGraphApiService = async (
    agentBaseCredentials: AgentBaseCredentials
): Promise<ServiceResponse<ConversationLanggraph[]>> => {
    const AGENT_BASE_API_URL = getAgentBaseApiUrl();
    const endpoint = `${AGENT_SERVICE_ROUTE_PREFIX}/conversation-langgraph/get-all-platform-user-conversations-langgraph`;

    return makeAgentBaseRequest<ConversationLanggraph[]>(
        AGENT_BASE_API_URL,
        'GET',
        endpoint,
        agentBaseCredentials,
        undefined,
        undefined
    );
}; 