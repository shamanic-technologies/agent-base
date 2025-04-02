/**
 * Shared agent types and utilities
 *
 * Provides a single source of truth for agent types and
 * utilities for mapping between database and application formats.
 */

/**
 * Agent record structure
 */
export interface AgentRecord {
  agent_id: string;
  agent_first_name: string;
  agent_last_name: string;
  agent_profile_picture: string;
  agent_gender: string;
  agent_system_prompt: string;
  agent_model_id: string;
  agent_memory: string;
  agent_job_title: string;
  created_at: string | Date;
  updated_at: string | Date;
}

/**
 * User-Agent link record structure
 */
export interface UserAgentRecord {
  user_id: string;
  agent_id: string;
  created_at: string | Date;
  updated_at: string | Date;
}

/**
 * Input for creating a new agent
 */
export interface CreateAgentInput {
  agent_first_name: string;
  agent_last_name: string;
  agent_profile_picture: string;
  agent_gender: string;
  agent_system_prompt: string;
  agent_model_id: string;
  agent_memory: string;
  agent_job_title: string;
}

/**
 * Input for updating an existing agent
 */
export interface UpdateAgentInput {
  agent_id: string;
  agent_first_name?: string;
  agent_last_name?: string;
  agent_profile_picture?: string;
  agent_gender?: string;
  agent_system_prompt?: string;
  agent_model_id?: string;
  agent_memory?: string;
  agent_job_title?: string;
}

/**
 * Input for linking an agent to a user
 */
export interface LinkAgentInput {
  user_id: string;
  agent_id: string;
}

/**
 * Input for retrieving a list of agents associated with a user ID.
 */
export interface ListUserAgentsInput {
  user_id: string;
}

/**
 * Input for retrieving a specific agent associated with a user ID.
 */
export interface GetUserAgentInput {
  user_id: string;
  agent_id: string;
}

/**
 * Standard API response format
 */
export interface AgentDatabaseResponse {
  success: boolean;
  error?: string;
}

/**
 * Standard agent API response format
 */
export interface CreateAgentResponse<T = AgentRecord> extends AgentDatabaseResponse {
  data?: T;
}

/**
 * Standard agent update API response format
 */
export interface UpdateAgentResponse<T = AgentRecord> extends AgentDatabaseResponse {
  data?: T;
}

/**
 * Standard agent link API response format
 */
export interface LinkAgentToUserResponse<T = UserAgentRecord> extends AgentDatabaseResponse {
  data?: T;
}

/**
 * Maps a snake_case database record to camelCase agent object
 */
export function mapFromDatabase(record: AgentRecord): Agent {
  return {
    agentId: record.agent_id,
    firstName: record.agent_first_name,
    lastName: record.agent_last_name,
    profilePicture: record.agent_profile_picture,
    gender: record.agent_gender,
    systemPrompt: record.agent_system_prompt,
    modelId: record.agent_model_id,
    memory: record.agent_memory,
    jobTitle: record.agent_job_title,
    createdAt: typeof record.created_at === 'string' ? new Date(record.created_at) : record.created_at,
    updatedAt: typeof record.updated_at === 'string' ? new Date(record.updated_at) : record.updated_at,
  };
}

/**
 * Maps a camelCase agent object to snake_case database fields
 */
export function mapToDatabase(agent: Partial<Agent>): Partial<AgentRecord> {
  const mapped: Partial<AgentRecord> = {};
  
  if ('agentId' in agent && agent.agentId !== undefined) {
    mapped.agent_id = agent.agentId;
  }
  
  if ('firstName' in agent && agent.firstName !== undefined) {
    mapped.agent_first_name = agent.firstName;
  }
  
  if ('lastName' in agent && agent.lastName !== undefined) {
    mapped.agent_last_name = agent.lastName;
  }
  
  if ('profilePicture' in agent && agent.profilePicture !== undefined) {
    mapped.agent_profile_picture = agent.profilePicture;
  }
  
  if ('gender' in agent && agent.gender !== undefined) {
    mapped.agent_gender = agent.gender;
  }
  
  if ('systemPrompt' in agent && agent.systemPrompt !== undefined) {
    mapped.agent_system_prompt = agent.systemPrompt;
  }
  
  if ('modelId' in agent && agent.modelId !== undefined) {
    mapped.agent_model_id = agent.modelId;
  }
  
  if ('memory' in agent && agent.memory !== undefined) {
    mapped.agent_memory = agent.memory;
  }
  
  if ('jobTitle' in agent && agent.jobTitle !== undefined) {
    mapped.agent_job_title = agent.jobTitle;
  }
  
  return mapped;
}

/**
 * Simplified agent interface with camelCase properties
 */
export interface Agent {
  agentId: string;
  firstName: string;
  lastName: string;
  profilePicture: string;
  gender: string;
  systemPrompt: string;
  modelId: string;
  memory: string;
  jobTitle: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Response containing a list of agents.
 */
export interface ListUserAgentsResponse extends AgentDatabaseResponse {
  data?: AgentRecord[];
}

/**
 * Response containing a single agent record.
 */
export interface GetUserAgentResponse extends AgentDatabaseResponse {
  data?: AgentRecord;
} 