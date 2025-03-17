/**
 * Chat Types
 * Defines types and interfaces used across chat components
 */

// Message type (user or AI)
export type MessageType = 'user' | 'ai';

// Message interface
export interface Message {
  id: string;
  type: MessageType;
  text: string;
  rawResponse?: any; // Store the raw response for debug panel
  chunks?: any[]; // Store stream chunks for debug panel
  createdAt: Date;
}

// Debug panel data structure
export interface DebugData {
  thread_id: string;
  streaming_active: boolean;
  current_streaming_chunks: any[];
  current_text: string;
  message_history: any[];
} 