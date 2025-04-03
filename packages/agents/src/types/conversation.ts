/**
 * Types related to Conversations.
 */
import { BaseResponse } from './common.js';
import { ConversationRecord as ConversationRecordType } from './conversation.js'; // Self-import for consistency if needed, or define directly

// --- Conversation Records and Inputs ---

export interface ConversationRecord {
  conversation_id: string;
  agent_id: string;
  channel_id: string;
  created_at: string | Date;
  updated_at: string | Date;
}

export interface CreateConversationInput {
  conversation_id: string; 
  agent_id: string;
  channel_id: string;
}

export interface GetConversationsInput {
  agent_id: string;
}

// --- Conversation Responses ---

export interface CreateConversationResponse extends BaseResponse {
    data?: { conversation_id: string };
}

export interface GetConversationsResponse extends BaseResponse {
    data?: ConversationRecord[]; // Use the defined type
}

/**
 * Input for retrieving the current conversation for an agent.
 */
export interface GetAgentCurrentConversationInput {
  agent_id: string;
}

/**
 * Response for retrieving the current conversation for an agent.
 * Returns a single record or null/undefined in data if not found.
 */
export interface GetAgentCurrentConversationResponse extends BaseResponse {
    data?: ConversationRecord | null;
} 