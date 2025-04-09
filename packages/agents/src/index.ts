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

// Export conversation-related types
export * from './types/conversation.js';

// Export user-related types
export * from './types/user.js';

// --- Utility Functions (kept here for now) ---

import { AgentRecord, Agent } from './types/agent.js'; // Import types needed by mappers
import { UserRecord, User } from './types/user.js';

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
  if (agent.modelId !== undefined) record.agent_model_id = agent.modelId;
  if (agent.memory !== undefined) record.agent_memory = agent.memory;
  if (agent.jobTitle !== undefined) record.agent_job_title = agent.jobTitle;
  // createdAt and updatedAt are usually handled by the database
  return record;
}

/**
 * Maps a snake_case user database record to camelCase user object
 */
export function mapUserFromDatabase(record: UserRecord): User {
  if (!record) {
    throw new Error('Invalid user record provided to mapUserFromDatabase');
  }
  return {
    userId: record.user_id,
    providerUserId: record.provider_user_id,
    email: record.email,
    displayName: record.display_name,
    profileImage: record.profile_image,
    lastLogin: new Date(record.last_login),
    createdAt: new Date(record.created_at),
    updatedAt: new Date(record.updated_at)
  };
}

/**
 * Maps a camelCase user object to snake_case database fields
 */
export function mapUserToDatabase(user: Partial<User>): Partial<UserRecord> {
  if (!user) {
    throw new Error('Invalid user provided to mapUserToDatabase');
  }
  const record: Partial<UserRecord> = {};
  if (user.userId !== undefined) record.user_id = user.userId;
  if (user.providerUserId !== undefined) record.provider_user_id = user.providerUserId;
  if (user.email !== undefined) record.email = user.email;
  if (user.displayName !== undefined) record.display_name = user.displayName;
  if (user.profileImage !== undefined) record.profile_image = user.profileImage;
  // lastLogin, createdAt and updatedAt are usually handled by the database
  return record;
}

// Reminder: Manually add 'system' role to MessageRecord and CreateMessageInput in message.ts if needed. 