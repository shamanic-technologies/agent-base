/**
 * @agent-base/agents Package
 * 
 * Exports all shared types and potentially utility functions 
 * for the agent-base system.
 */

// Export common types
export * from './types/common.js';

// Export agent-related types
export * from './types/agent.js';

// Export message-related types
export * from './types/message.js';

// Export conversation-related types
export * from './types/conversation.js';

// --- Utility Functions (kept here for now) ---

import { AgentRecord, Agent } from './types/agent.js'; // Import types needed by mappers

/**
 * Maps a snake_case database record to camelCase agent object
 */
export function mapFromDatabase(record: AgentRecord): Agent {
  if (!record) {
    throw new Error('Invalid record provided to mapFromDatabase');
  }
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
    createdAt: new Date(record.created_at),
    updatedAt: new Date(record.updated_at)
  };
}

/**
 * Maps a camelCase agent object to snake_case database fields
 */
export function mapToDatabase(agent: Partial<Agent>): Partial<AgentRecord> {
  if (!agent) {
    throw new Error('Invalid agent provided to mapToDatabase');
  }
  const record: Partial<AgentRecord> = {};
  if (agent.agentId !== undefined) record.agent_id = agent.agentId;
  if (agent.firstName !== undefined) record.agent_first_name = agent.firstName;
  if (agent.lastName !== undefined) record.agent_last_name = agent.lastName;
  if (agent.profilePicture !== undefined) record.agent_profile_picture = agent.profilePicture;
  if (agent.gender !== undefined) record.agent_gender = agent.gender;
  if (agent.systemPrompt !== undefined) record.agent_system_prompt = agent.systemPrompt;
  if (agent.modelId !== undefined) record.agent_model_id = agent.modelId;
  if (agent.memory !== undefined) record.agent_memory = agent.memory;
  if (agent.jobTitle !== undefined) record.agent_job_title = agent.jobTitle;
  // createdAt and updatedAt are usually handled by the database
  return record;
}

// Reminder: Manually add 'system' role to MessageRecord and CreateMessageInput in message.ts if needed. 