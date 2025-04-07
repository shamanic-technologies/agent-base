/**
 * Types related to Agents.
 */
import { BaseResponse } from './common.js';

// --- Enums and Core Records ---

export type Gender = 'man' | 'woman' | 'other';

export interface AgentRecord {
  agent_id: string;
  agent_first_name: string;
  agent_last_name: string;
  agent_profile_picture: string;
  agent_gender: Gender;
  agent_system_prompt: string;
  agent_model_id: string;
  agent_memory: string;
  agent_job_title: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserAgentRecord {
  user_id: string;
  agent_id: string;
  created_at: Date;
}

// --- Agent Input Fields & Inputs ---

export interface AgentCreationFields {
  agent_first_name: string;
  agent_last_name: string;
  agent_profile_picture: string;
  agent_gender: Gender;
  agent_system_prompt: string;
  agent_model_id: string;
  agent_memory: string;
  agent_job_title: string;
}

export interface CreateUserAgentInput extends AgentCreationFields {
  user_id: string;
}

export interface UpdateAgentInputFields {
  agent_id: string; 
  agent_first_name?: string;
  agent_last_name?: string;
  agent_profile_picture?: string;
  agent_gender?: Gender;
  agent_system_prompt?: string;
  agent_model_id?: string;
  agent_memory?: string;
  agent_job_title?: string;
}

export interface UpdateUserAgentInput extends UpdateAgentInputFields {
  user_id: string;
}

export interface ListUserAgentsInput {
  user_id: string;
}

export interface GetUserAgentInput {
  user_id: string;
  agent_id: string;
}

// --- Agent Responses ---

export interface CreateUserAgentResponse extends BaseResponse {
  data?: AgentRecord;
}

export interface UpdateUserAgentResponse extends BaseResponse {
  data?: AgentRecord;
}

export interface ListUserAgentsResponse extends BaseResponse {
  data?: AgentRecord[];
}

export interface GetUserAgentResponse extends BaseResponse {
  data?: AgentRecord;
}

// --- Simplified Application-Level Interface ---

export interface Agent {
  agentId: string;
  firstName: string;
  lastName: string;
  profilePicture: string;
  gender: Gender;
  systemPrompt: string;
  modelId: string;
  memory: string;
  jobTitle: string;
  createdAt: Date;
  updatedAt: Date;
} 