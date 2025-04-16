/**
 * Typed API client functions for interacting with the Database Service Conversation Endpoints.
 */
import { 
  makeServiceRequest,
  ServiceResponse,
  Conversation, // Use camelCase type for client consistency
  CreateConversationInput,
  UpdateConversationInput,
  GetConversationsFromAgentInput,
  ConversationId
} from '@agent-base/types';
import { Message } from 'ai'; // Need Message type for UpdateConversationInput

// Use the same base URL as defined elsewhere or manage centrally
const DATABASE_SERVICE_URL = process.env.DATABASE_SERVICE_URL || 'http://localhost:3006'; // Ensure consistency

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
  platformUserId: string
): Promise<ServiceResponse<Conversation>> => {
  if (!platformUserId) {
    throw new Error('[api-client:createConversation] platformUserId is required for request header.');
  }
  if (!data || !data.conversationId || !data.agentId || !data.channelId) {
    throw new Error('[api-client:createConversation] Input data must include conversationId, agentId, and channelId.');
  }
  const endpoint = '/conversations/create-conversation';
  return makeServiceRequest<Conversation>(
    DATABASE_SERVICE_URL,
    'POST',
    endpoint,
    platformUserId,
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
export const getConversationsFromAgent = async (
  params: GetConversationsFromAgentInput,
  platformUserId: string
): Promise<ServiceResponse<Conversation[]>> => {
  if (!platformUserId) {
    throw new Error('[api-client:getConversationsFromAgent] platformUserId is required for request header.');
  }
  if (!params || !params.agentId) {
    throw new Error('[api-client:getConversationsFromAgent] Query parameters must include agentId.');
  }
  const endpoint = '/conversations/get-conversations-from-agent';
  return makeServiceRequest<Conversation[]>(
    DATABASE_SERVICE_URL,
    'GET',
    endpoint,
    platformUserId,
    undefined, // No request body for GET
    params     // Pass params as query parameters
  );
};

/**
 * Gets conversations for an agent, or creates a default one if none exist.
 * 
 * Corresponds to: GET /conversations/get-or-create-conversations-from-agent
 * Note: The response type might be Conversation[] if found, or Conversation if created.
 * This client function reflects the endpoint directly. Consider separate get/create calls for simpler typing if needed.
 * 
 * @param params - Query parameters containing the agentId.
 * @param platformUserId - The platform user ID making the request (for headers).
 * @returns A ServiceResponse containing Conversation[] or Conversation or an error.
 */
export const getOrCreateConversationsFromAgent = async (
  params: GetConversationsFromAgentInput,
  platformUserId: string
): Promise<ServiceResponse<Conversation[] | Conversation>> => {
  if (!platformUserId) {
    throw new Error('[api-client:getOrCreateConversationsFromAgent] platformUserId is required for request header.');
  }
  if (!params || !params.agentId) {
    throw new Error('[api-client:getOrCreateConversationsFromAgent] Query parameters must include agentId.');
  }
  const endpoint = '/conversations/get-or-create-conversations-from-agent';
  return makeServiceRequest<Conversation[] | Conversation>(
    DATABASE_SERVICE_URL,
    'GET',
    endpoint,
    platformUserId,
    undefined, // No request body for GET
    params     // Pass params as query parameters
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
export const getConversation = async (
  params: ConversationId,
  platformUserId: string
): Promise<ServiceResponse<Conversation>> => {
  if (!platformUserId) {
    throw new Error('[api-client:getConversation] platformUserId is required for request header.');
  }
  if (!params || !params.conversationId) {
    throw new Error('[api-client:getConversation] Path parameters must include conversationId.');
  }
  // Construct endpoint with path parameter
  const endpoint = `/conversations/get-conversation/${params.conversationId}`;
  return makeServiceRequest<Conversation>(
    DATABASE_SERVICE_URL,
    'GET',
    endpoint,
    platformUserId
    // No query params or body needed
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
export const updateConversation = async (
  data: UpdateConversationInput,
  platformUserId: string
): Promise<ServiceResponse<Conversation>> => {
  if (!platformUserId) {
    throw new Error('[api-client:updateConversation] platformUserId is required for request header.');
  }
  if (!data || !data.conversationId || !data.messages) {
    throw new Error('[api-client:updateConversation] Input data must include conversationId and messages.');
  }
  const endpoint = '/conversations/update-conversation';
  return makeServiceRequest<Conversation>(
    DATABASE_SERVICE_URL,
    'POST',
    endpoint,
    platformUserId,
    data
  );
}; 