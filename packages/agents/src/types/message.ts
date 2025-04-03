/**
 * Types related to Messages.
 */
import { BaseResponse } from './common.js';

// --- Message Records and Inputs ---

export interface MessageRecord {
  message_id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | null;
  tool_calls: any[] | null;
  tool_call_id: string | null;
  tool_result: any | null;
  created_at: string | Date;
}

export interface CreateMessageInput {
  conversation_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content?: string | null;
  tool_calls?: any[] | null; 
  tool_call_id?: string | null;
  tool_result?: any | null; 
}

export interface GetMessagesInput {
  conversation_id: string;
}

// --- Message Responses ---

export interface CreateMessageResponse extends BaseResponse {
    data?: { message_id: string };
}

export interface GetMessagesResponse extends BaseResponse {
    data?: MessageRecord[];
}

/**
 * Response for retrieving the messages of the current conversation for an agent.
 */
export interface GetAgentCurrentConversationMessagesResponse extends BaseResponse {
    data?: MessageRecord[];
} 