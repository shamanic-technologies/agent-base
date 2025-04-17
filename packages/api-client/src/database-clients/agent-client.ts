// packages/api-client/src/databaseClient.ts

/**
 * Typed API client functions for interacting with the Database Service.
 */
import { 
  ServiceResponse,
  GetClientUserAgentInput,
  CreateClientUserAgentInput,
  UpdateAgentInput,
} from '@agent-base/types';
import { makeAPIServiceRequest } from '../utils/service-client';
const DATABASE_SERVICE_URL = process.env.DATABASE_SERVICE_URL || 'http://localhost:3006';

// Define clearer input types if not already in @agent-base/types
interface ListUserAgentsParams { clientUserId: string; }
interface GetUserAgentParams { clientUserId: string; agentId: string; }
interface GetAgentFromConversationParams { conversationId: string; }

// ==============================================================================
// Agent Client Functions
// ==============================================================================

/**
 * Creates a new agent linked to a client user.
 * Requires platformUserId for authentication headers.
 * POST /agents/create-user-agent
 */
export const createUserAgent = async (
  data: CreateClientUserAgentInput,
  platformUserId: string,
  platformApiKey: string,
  clientUserId: string
): Promise<ServiceResponse<GetClientUserAgentInput>> => { // Revert to generic response type

  return makeAPIServiceRequest<GetClientUserAgentInput>( // Expect AgentRecord in data
    DATABASE_SERVICE_URL,
    'POST',
    '/agents/create-user-agent',
    platformUserId,
    clientUserId, // Pass clientUserId for header
    platformApiKey, // Pass platformApiKey for header
    data          // Pass original data as body
  );
};

/**
 * Updates an existing agent.
 * Requires platformUserId for authentication headers.
 * POST /agents/update-user-agent
 */
export const updateUserAgent = async (
  data: UpdateAgentInput,
  platformUserId: string,
  platformApiKey: string,
  clientUserId: string
): Promise<ServiceResponse<GetClientUserAgentInput>> => { // Revert to generic response type

  return makeAPIServiceRequest<GetClientUserAgentInput>( // Expect AgentRecord in data
    DATABASE_SERVICE_URL,
    'POST',
    '/agents/update-user-agent',
    platformUserId,
    clientUserId, // Pass clientUserId for header
    platformApiKey, // Pass platformApiKey for header
    data          // Pass original data as body
  );
};

/**
 * Lists agents for a client user.
 * Requires platformUserId for authentication headers.
 * GET /agents/list-user-agents
 */
export const listUserAgents = async (
  params: ListUserAgentsParams, // Use defined interface
  platformUserId: string,
  platformApiKey: string,
  clientUserId: string
): Promise<ServiceResponse<GetClientUserAgentInput[]>> => { // Revert to generic response type
  
  return makeAPIServiceRequest<GetClientUserAgentInput[]>( // Expect AgentRecord[] in data
    DATABASE_SERVICE_URL,
    'GET',
    '/agents/list-user-agents',
    platformUserId,
    clientUserId, // Pass clientUserId for header
    platformApiKey, // Pass platformApiKey for header
    undefined,    // No request body for GET
    params // Pass clientUserId as user_id query param
  );
};

/**
 * Gets a specific agent.
 * Requires platformUserId for authentication headers.
 * GET /agents/get-user-agent
 */
export const getUserAgentApiClient = async (
  params: GetUserAgentParams, // Use defined interface
  platformUserId: string,
  platformApiKey: string,
  clientUserId: string
): Promise<ServiceResponse<GetClientUserAgentInput>> => { // Revert to generic response type

  return makeAPIServiceRequest<GetClientUserAgentInput>( // Expect AgentRecord in data
    DATABASE_SERVICE_URL,
    'GET',
    '/agents/get-user-agent',
    platformUserId,
    clientUserId, // Pass clientUserId for header
    platformApiKey, // Pass platformApiKey for header
    undefined,    // No request body for GET
    params // Pass clientUserId and agentId as query params
  );
};

/**
 * Gets the agent associated with a specific conversation.
 * Requires platformUserId for authentication headers.
 * GET /agents/get-conversation-agent
 */
export const getAgentFromConversation = async (
  params: GetAgentFromConversationParams, // Use defined interface
  clientUserId: string, // Pass clientUserId explicitly for the header
  platformUserId: string,
  platformApiKey: string
): Promise<ServiceResponse<GetClientUserAgentInput>> => { // Revert to generic response type

  return makeAPIServiceRequest<GetClientUserAgentInput>( // Expect AgentRecord in data
    DATABASE_SERVICE_URL,
    'GET',
    '/agents/get-conversation-agent',
    platformUserId,
    clientUserId, // Pass clientUserId for header
    platformApiKey, // Pass platformApiKey for header
    undefined,    // No request body
    params // Pass conversationId as query param
  );
};
