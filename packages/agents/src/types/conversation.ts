/**
 * Types related to Conversations.
 */
import { BaseResponse } from './common.js';
import { ConversationRecord as ConversationRecordType } from './conversation.js'; // Self-import for consistency if needed, or define directly
import { UIMessage } from 'ai';
// --- Conversation Records and Inputs ---

export interface ConversationRecord {
  conversation_id: string;
  agent_id: string;
  channel_id: string;
  messages: UIMessage[];
  created_at: string | Date;
  updated_at: string | Date;
}

export interface CreateConversationInput {
  conversation_id: string; 
  agent_id: string;
  channel_id: string;
}

export interface GetConversationsFromAgentInput {
  agent_id: string;
}

// --- Conversation Responses ---

export interface CreateConversationResponse extends BaseResponse {
    data?: { conversation_id: string };
}

export interface GetConversationsResponse extends BaseResponse {
    data?: ConversationRecord[]; // Use the defined type
}

export interface GetConversationResponse extends BaseResponse {
    data?: ConversationRecord; // Use the defined type
}
