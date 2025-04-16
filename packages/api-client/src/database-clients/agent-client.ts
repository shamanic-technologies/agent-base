// packages/api-client/src/databaseClient.ts

/**
 * Typed API client functions for interacting with the Database Service.
 */
import { 
  ServiceResponse,
  PlatformUser,             // Import the PlatformUser type
  GetOrCreatePlatformUserInput, // Import the input type
  Agent,
  CreateUserAgentInput,
  UpdateUserAgentInput,
  ListUserAgentsInput,
  GetUserAgentInput
} from '@agent-base/types';
import { makeAuthenticatedServiceRequest } from '../utils/service-client';
const DATABASE_SERVICE_URL = process.env.DATABASE_SERVICE_URL || 'http://localhost:3006';
// ==============================================================================
// Agent Client Functions
// ==============================================================================

/**
 * Creates a new agent and links it to the specified client user.
 * 
 * Corresponds to: POST /agents/create-user-agent
 * 
 * @param data - Input data containing user_id and agent details.
 * @param platformUserId - The platform user ID making the request (for headers).
 * @returns A ServiceResponse containing the created Agent object or an error.
 */
export const createUserAgent = async (
  data: CreateUserAgentInput,
  platformUserId: string
): Promise<ServiceResponse<Agent>> => {
  if (!platformUserId) {
    throw new Error('[api-client:createUserAgent] platformUserId is required for request header.');
  }
  if (!data || !data.userId) {
    throw new Error('[api-client:createUserAgent] Input data must include userId.');
  }
  // Add more validation if needed based on CreateUserAgentInput required fields
  const endpoint = '/agents/create-user-agent';
  return makeAuthenticatedServiceRequest<Agent>(
    DATABASE_SERVICE_URL,
    'POST',
    endpoint,
    platformUserId,
    data // Pass data as request body
  );
};

/**
 * Updates an existing agent owned by the specified client user.
 * 
 * Corresponds to: POST /agents/update-user-agent
 * 
 * @param data - Input data containing user_id, agent_id, and update fields.
 * @param platformUserId - The platform user ID making the request (for headers).
 * @returns A ServiceResponse containing the updated Agent object or an error.
 */
export const updateUserAgent = async (
  data: UpdateUserAgentInput,
  platformUserId: string
): Promise<ServiceResponse<Agent>> => {
  if (!platformUserId) {
    throw new Error('[api-client:updateUserAgent] platformUserId is required for request header.');
  }
  if (!data || !data.userId || !data.agentId) {
    throw new Error('[api-client:updateUserAgent] Input data must include userId and agentId.');
  }
  const endpoint = '/agents/update-user-agent';
  return makeAuthenticatedServiceRequest<Agent>(
    DATABASE_SERVICE_URL,
    'POST',
    endpoint,
    platformUserId,
    data // Pass data as request body
  );
};

/**
 * Lists all agents associated with a specific client user ID.
 * 
 * Corresponds to: GET /agents/list-user-agents
 * 
 * @param params - Query parameters containing the user_id.
 * @param platformUserId - The platform user ID making the request (for headers).
 * @returns A ServiceResponse containing an array of Agent objects or an error.
 */
export const listUserAgents = async (
  params: ListUserAgentsInput,
  platformUserId: string
): Promise<ServiceResponse<Agent[]>> => {
  if (!platformUserId) {
    throw new Error('[api-client:listUserAgents] platformUserId is required for request header.');
  }
  if (!params || !params.userId) {
    throw new Error('[api-client:listUserAgents] Query parameters must include userId.');
  }
  const endpoint = '/agents/list-user-agents';
  return makeAuthenticatedServiceRequest<Agent[]>(
    DATABASE_SERVICE_URL,
    'GET',
    endpoint,
    platformUserId,
    undefined, // No request body for GET
    params     // Pass params as query parameters
  );
};

/**
 * Gets a specific agent owned by the specified client user.
 * 
 * Corresponds to: GET /agents/get-user-agent
 * 
 * @param params - Query parameters containing user_id and agent_id.
 * @param platformUserId - The platform user ID making the request (for headers).
 * @returns A ServiceResponse containing the Agent object or an error (e.g., if not found or not owned).
 */
export const getUserAgent = async (
  params: GetUserAgentInput,
  platformUserId: string
): Promise<ServiceResponse<Agent>> => {
  if (!platformUserId) {
    throw new Error('[api-client:getUserAgent] platformUserId is required for request header.');
  }
  if (!params || !params.userId || !params.agentId) {
    throw new Error('[api-client:getUserAgent] Query parameters must include userId and agentId.');
  }
  const endpoint = '/agents/get-user-agent';
  return makeAuthenticatedServiceRequest<Agent>(
    DATABASE_SERVICE_URL,
    'GET',
    endpoint,
    platformUserId,
    undefined, // No request body for GET
    params     // Pass params as query parameters
  );
};
