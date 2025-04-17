/**
 * Types related to Agents.
 */
import { BaseResponse } from './common.js';

// --- Enums and Core Records ---

export type Gender = 'man' | 'woman' | 'other';

export interface AgentRecord {
  id: string;
  first_name: string;
  last_name: string;
  profile_picture: string;
  gender: Gender;
  model_id: string;
  memory: string;
  job_title: string;
  created_at: Date;
  updated_at: Date;
}

export interface ClientUserAgentRecord {
  client_user_id: string;
  agent_id: string;
  created_at: Date;
}

// --- Agent Input Fields & Inputs ---

export interface CreateAgentInput {
  firstName: string;
  lastName: string;
  profilePicture: string;
  gender: Gender;
  modelId: string;
  memory: string;
  jobTitle: string;
}

export interface CreateClientUserAgentInput extends CreateAgentInput {
  clientUserId: string;
}

export interface LinkAgentToClientUserInput {
  clientUserId: string;
  agentId: string;
}

export interface UpdateAgentInput {
  id: string; 
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
  gender?: Gender;
  modelId?: string;
  memory?: string;
  jobTitle?: string;
}

export interface UpdateClientUserAgentInput {
  clientUserId: string;
  agentId: string; 
  agentFirstName?: string;
  agentLastName?: string;
  agentProfilePicture?: string;
  agentGender?: Gender;
  agentModelId?: string;
  agentMemory?: string;
  agentJobTitle?: string;
}

export interface ListClientUserAgentsInput {
  clientUserId: string;
}

export interface GetClientUserAgentInput {
  clientUserId: string;
  agentId: string;
}

// --- Simplified Application-Level Interface ---

export interface Agent {
  id: string;
  firstName: string;
  lastName: string;
  profilePicture: string;
  gender: Gender;
  modelId: string;
  memory: string;
  jobTitle: string;
  createdAt: Date;
  updatedAt: Date;
} 


/**
 * Maps a snake_case database record to camelCase agent object
 */
export function mapAgentFromDatabase(record: AgentRecord): Agent {
  if (!record) {
    throw new Error('Invalid record provided to mapFromDatabase');
  }
  return {
    id: record.id,
    firstName: record.first_name,
    lastName: record.last_name,
    profilePicture: record.profile_picture,
    gender: record.gender,
    modelId: record.model_id,
    memory: record.memory,
    jobTitle: record.job_title,
    createdAt: new Date(record.created_at),
    updatedAt: new Date(record.updated_at)
  };
}

/**
 * Maps a camelCase agent object to snake_case database fields
 */
export function mapAgentToDatabase(agent: Partial<Agent>): Partial<AgentRecord> {
  if (!agent) {
    throw new Error('Invalid agent provided to mapToDatabase');
  }
  const record: Partial<AgentRecord> = {};
  if (agent.id !== undefined) record.id = agent.id;
  if (agent.firstName !== undefined) record.first_name = agent.firstName;
  if (agent.lastName !== undefined) record.last_name = agent.lastName;
  if (agent.profilePicture !== undefined) record.profile_picture = agent.profilePicture;
  if (agent.gender !== undefined) record.gender = agent.gender;
  if (agent.modelId !== undefined) record.model_id = agent.modelId;
  if (agent.memory !== undefined) record.memory = agent.memory;
  if (agent.jobTitle !== undefined) record.job_title = agent.jobTitle;
  // createdAt and updatedAt are usually handled by the database
  return record;
}
