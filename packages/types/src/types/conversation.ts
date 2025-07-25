/**
 * Types related to Conversations.
 */
// Use Message from 'ai' instead of UIMessage
// import { Message } from 'ai';
// --- Conversation Records and Inputs ---

// export interface ConversationRecord {
//   conversation_id: string;
//   agent_id: string;
//   channel_id: string;
//   messages: Message[];
//   created_at: string | Date;
//   updated_at: string | Date;
// }

// export interface Conversation {
//   conversationId: string;
//   agentId: string;
//   channelId: string;
//   messages: Message[];
//   createdAt: string | Date;
//   updatedAt: string | Date;
// }

// export interface CreateConversationInput {
//   conversationId: string; 
//   agentId: string;
//   channelId: string;
// }

// export interface AgentId {
//   agentId: string;
// }

// export interface UpdateConversationInput {
//   conversationId: string;
//   messages: Message[];
// }

// --- Conversation Responses ---

// export interface ConversationId {
//   conversationId: string;
// }


/**
 * Maps a snake_case database record to camelCase agent object
 */
// export function mapConversationFromDatabase(record: ConversationRecord): Conversation {
//   if (!record) {
//     throw new Error('Invalid record provided to mapFromDatabase');
//   }
//   return {
//     conversationId: record.conversation_id,
//     agentId: record.agent_id,
//     channelId: record.channel_id,
//     messages: record.messages,
//     createdAt: record.created_at,
//     updatedAt: record.updated_at
//   };
// }

/**
 * Maps a camelCase agent object to snake_case database fields
 */
// export function mapConversationToDatabase(conversation: Conversation): Partial<ConversationRecord> {
//   if (!conversation) {
//     throw new Error('Invalid conversation provided to mapToDatabase');
//   }
//   const record: Partial<ConversationRecord> = {};
//   if (conversation.conversationId !== undefined) record.conversation_id = conversation.conversationId;
//   if (conversation.agentId !== undefined) record.agent_id = conversation.agentId;
//   if (conversation.channelId !== undefined) record.channel_id = conversation.channelId;
//   if (conversation.messages !== undefined) record.messages = conversation.messages;
//   return record;
// }

/**
 * Sanitizes a conversation ID to remove problematic URL characters and ensure consistency.
 * - Converts to lowercase.
 * - Allows alphanumeric characters (a-z, 0-9), hyphen (-), underscore (_), and colon (:).
 * - Replaces all other characters with an underscore (_).
 * @param id The conversation ID string to sanitize.
 * @returns The sanitized conversation ID string.
 */
// export function sanitizeConversationId(id: string): string {
//   if (typeof id !== 'string' || !id) return ''; // Handle null, undefined, or non-string input
//   return id.toLowerCase().replace(/[^a-z0-9\-_:]/g, '_');
// }

