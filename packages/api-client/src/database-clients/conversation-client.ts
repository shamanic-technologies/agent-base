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
    params: ConversationId,
    clientUserId: string, // Required for header
    platformUserId: string, // Required for header
    platformApiKey: string
): Promise<ServiceResponse<Conversation>> => { // Expect single record

    return makeInternalAPIServiceRequest<Conversation>(
        getDatabaseServiceUrl(),
        'GET',
        `/conversations/get-conversation/${params.conversationId}`,
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



