/**
 * Types related to Conversations.
 */
import { BaseResponse } from './common.js';
// Use Message from 'ai' instead of UIMessage
// @ts-ignore - Message not directly exported from 'ai' in this context
import { Message } from 'ai';
import { ConversationRecord as ConversationRecordType } from './conversation.js'; // Self-import for consistency if needed, or define directly
// --- Conversation Records and Inputs ---

export interface ConversationRecord {
  conversation_id: string;
  agent_id: string;
  channel_id: string;
  messages: Message[];
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

export interface UpdateConversationInput {
  conversation_id: string;
  messages: Message[];
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
