/**
 * Typed API client functions for interacting with the Database Service Conversation Endpoints.
 */
import { 
  ServiceResponse,
  Conversation, // Use camelCase type for client consistency
  CreateConversationInput,
  UpdateConversationInput,
  AgentId,
  ConversationId,
  ConversationRecord,
  BaseResponse
} from '@agent-base/types';
import { makeInternalAPIServiceRequest } from '../utils/service-client';
import { getDatabaseServiceUrl } from '../utils/config'; // Import the centralized getter

// ==============================================================================
// Conversation Client Functions
// ==============================================================================

/**
 * Creates a new conversation record.
 * 
 * Corresponds to: POST /conversations/create-conversation
 * 
 * @param data - Input data containing conversationId, agentId, channelId.
 * @param platformUserId - The platform user ID making the request (for headers).
 * @returns A ServiceResponse containing the created/found Conversation object or an error.
 */
export const createConversation = async (
  data: CreateConversationInput,
  platformUserId: string,
  platformApiKey: string,
  clientUserId: string
): Promise<ServiceResponse<Conversation>> => {
  if (!platformUserId) {
    throw new Error('[api-client:createConversation] platformUserId is required for request header.');
  }
  if (!data || !data.conversationId || !data.agentId || !data.channelId) {
    throw new Error('[api-client:createConversation] Input data must include conversationId, agentId, and channelId.');
  }
  const endpoint = '/conversations/create-conversation';
  return makeInternalAPIServiceRequest<Conversation>(
    getDatabaseServiceUrl(),
    'POST',
    endpoint,
    platformUserId,
    clientUserId,
    platformApiKey,
    data
  );
};

/**
 * Gets all conversations associated with a specific agent ID.
 * 
 * Corresponds to: GET /conversations/get-conversations-from-agent
 * 
 * @param params - Query parameters containing the agentId.
 * @param platformUserId - The platform user ID making the request (for headers).
 * @returns A ServiceResponse containing an array of Conversation objects or an error.
 */
export const getConversationsInternalApiService = async (
  params: AgentId,
  platformUserId: string,
  platformApiKey: string,
  clientUserId: string
): Promise<ServiceResponse<Conversation[]>> => {
  if (!platformUserId) {
    throw new Error('[api-client:getConversationsFromAgent] platformUserId is required for request header.');
  }
  if (!params || !params.agentId) {
    throw new Error('[api-client:getConversationsFromAgent] Query parameters must include agentId.');
  }
  const endpoint = '/conversations/get-conversations-from-agent';
  return makeInternalAPIServiceRequest<Conversation[]>(
    getDatabaseServiceUrl(),
    'GET',
    endpoint,
    platformUserId,
    clientUserId,
    platformApiKey,
    undefined, // No request body for GET
    params     // Pass params as query parameters
  );
};

/**
 * Retrieves conversations for an agent, or creates a default one.
 * GET /conversations/get-or-create-conversations-from-agent
 */
export const getOrCreateConversationsInternalApiService = async (
    params: AgentId,
    clientUserId: string, // Required for header
    platformUserId: string, // Required for header
    platformApiKey: string
): Promise<ServiceResponse<Conversation[]>> => { // Expect array of records

    return makeInternalAPIServiceRequest<Conversation[]>(
        getDatabaseServiceUrl(),
        'GET',
        '/conversations/get-or-create-conversations-from-agent',
        platformUserId,
        clientUserId,
        platformApiKey,
        undefined, // No Body
        params // Query param
    );
};

/**
 * Retrieves a single conversation by its ID.
 * GET /conversations/get-conversation/:conversationId
 */
export const getConversationByIdInternalApiService = async (
    params: AgentId,
    clientUserId: string, // Required for header
    platformUserId: string, // Required for header
    platformApiKey: string
): Promise<ServiceResponse<Conversation>> => { // Expect single record

    return makeInternalAPIServiceRequest<Conversation>(
        getDatabaseServiceUrl(),
        'GET',
        `/conversations/get-conversation/${params.agentId}`,
        platformUserId,
        clientUserId,
        platformApiKey,
        undefined, // No Body
        undefined // No Query Params
    );
};

/**
 * Updates the messages array for a specific conversation.
 * POST /conversations/update-conversation
 */
export const updateConversationMessagesInternalApiService = async (
    body: UpdateConversationInput,
    clientUserId: string, // Required for header
    platformUserId: string, // Required for header
    platformApiKey: string
): Promise<BaseResponse> => { // Expect BaseResponse (success/error)

    return makeInternalAPIServiceRequest<BaseResponse>( // Specify BaseResponse
        getDatabaseServiceUrl(),
        'POST',
        '/conversations/update-conversation',
        platformUserId,
        clientUserId,
        platformApiKey,
        body,      // Pass body
        undefined // No Query Params
    );
};

/**
 * Creates a new conversation.
 * POST /conversations/create-conversation
 */
export const createConversationInternalApiService = async (
    body: CreateConversationInput, // Use shared type
    clientUserId: string, // Required for header
    platformUserId: string, // Required for header
    platformApiKey: string
): Promise<ServiceResponse<Conversation>> => { // Expect created record
 
    return makeInternalAPIServiceRequest<Conversation>( // Expect created record
        getDatabaseServiceUrl(),
        'POST',
        '/conversations/create-conversation',
        platformUserId,
        clientUserId,
        platformApiKey,
        body,      // Pass body
        undefined // No Query Params
    );
};

/**
 * Gets a specific conversation by its ID.
 * 
 * Corresponds to: GET /conversations/get-conversation/:conversation_id
 * 
 * @param params - Path parameters containing conversationId.
 * @param platformUserId - The platform user ID making the request (for headers).
 * @returns A ServiceResponse containing the Conversation object or an error.
 */
export const getConversationInternalApiService = async (
  params: ConversationId,
  platformUserId: string,
  platformApiKey: string,
  clientUserId: string
): Promise<ServiceResponse<Conversation>> => {
  // Construct endpoint with path parameter
  const endpoint = `/conversations/get-conversation/${params.conversationId}`;
  console.log(`[api-client:getConversation] Calling endpoint: ${endpoint}`);
  return makeInternalAPIServiceRequest<Conversation>(
    getDatabaseServiceUrl(),
    'GET',
    endpoint,
    platformUserId,
    clientUserId,
    platformApiKey,
    undefined, // No Body
    undefined // No Query Params
  );
};

/**
 * Updates the messages array for a specific conversation.
 * 
 * Corresponds to: POST /conversations/update-conversation
 * 
 * @param data - Input data containing conversationId and the messages array.
 * @param platformUserId - The platform user ID making the request (for headers).
 * @returns A ServiceResponse containing the updated Conversation object or an error.
 */
export const updateConversationInternalApiService = async (
  data: UpdateConversationInput,
  platformUserId: string,
  platformApiKey: string,
  clientUserId: string
): Promise<ServiceResponse<Conversation>> => {
  const endpoint = '/conversations/update-conversation';
  return makeInternalAPIServiceRequest<Conversation>(
    getDatabaseServiceUrl(),
    'POST',
    endpoint,
    platformUserId,
    clientUserId,
    platformApiKey,
    data,
    undefined // No Query Params
  );
}; 