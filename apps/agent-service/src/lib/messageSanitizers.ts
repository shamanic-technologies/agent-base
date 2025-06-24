/**
 * @fileoverview
 * This file contains utility functions for sanitizing message histories
 * to prevent state-related errors in the Vercel AI SDK.
 */

import { Message } from 'ai';

// // Since the 'ai' package doesn't export the Message type cleanly in all contexts,
// // we define a local interface that covers the properties we need to interact with
// // for sanitization. This avoids type errors and ensures we're looking for the right fields.
// interface SanitizationMessage {
//   role: 'user' | 'assistant' | 'tool';
//   content: string | Array<{ type: 'text'; text: string } | { type: 'tool_call'; toolCallId: string }>;
//   toolCallId?: string;
// }

/**
 * Sanitizes a message history by removing an incomplete tool call sequence from the end.
 * An incomplete sequence occurs if an assistant message contains tool_calls but is not
 * followed by a corresponding number of tool result messages.
 *
 * @param messages - The array of messages to sanitize.
 * @returns A new array of messages with any incomplete tool call sequence removed.
 */
export function sanitizeIncompleteToolCalls(messages: Message[]): Message[] {
  let lastAssistantMsgIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'assistant') {
      lastAssistantMsgIndex = i;
      break;
    }
  }

  // If there's no assistant message, the history is considered safe.
  if (lastAssistantMsgIndex === -1) {
    return messages;
  }

  const lastAssistantMsg = messages[lastAssistantMsgIndex];

  // If the assistant message content isn't an array, it can't contain tool calls.
  if (!Array.isArray(lastAssistantMsg.content)) {
    return messages;
  }

  const requiredToolCallIds = new Set(
    lastAssistantMsg.content
      .filter((part: { type: string; }) => part.type === 'tool_call')
      .map((part) => (part as { type: 'tool_call'; toolCallId: string }).toolCallId),
  );

  // If the last assistant message had no tool calls, there's nothing to sanitize.
  if (requiredToolCallIds.size === 0) {
    return messages;
  }

  const subsequentToolMessages = messages.slice(lastAssistantMsgIndex + 1).filter((msg: any) => msg.role === 'tool');
  
  // According to the Vercel AI SDK documentation, the toolCallId for a tool result
  // is located inside the 'content' array.
  const providedToolCallIds = new Set(
    subsequentToolMessages.flatMap((msg: Message) => {
      if (Array.isArray(msg.content)) {
        // Filter for tool-result parts and map to their toolCallId
        return msg.content
          .filter((part: any) => part.type === 'tool-result' && part.toolCallId)
          .map((part: any) => part.toolCallId);
      }
      return [];
    })
  );
  
  // --- Enhanced Logging ---
  console.log('[Sanitizer] Last assistant message index:', lastAssistantMsgIndex);
  console.log('[Sanitizer] Required tool call IDs:', Array.from(requiredToolCallIds));
  console.log('[Sanitizer] Subsequent tool messages found:', subsequentToolMessages.length);
  console.log('[Sanitizer] Provided tool call IDs:', Array.from(providedToolCallIds));
  // -------------------------

  // Check if the number of required and provided tool calls match.
  // This is a robust way to check if the sequence is complete.
  if (requiredToolCallIds.size !== providedToolCallIds.size) {
    console.warn('[Agent Service /run] Detected incomplete tool call sequence at the end of the history. Sanitizing messages by removing the last assistant turn.');
    // Remove the last assistant message and all subsequent (tool) messages.
    return messages.slice(0, lastAssistantMsgIndex);
  }

  // A more thorough check to ensure all specific IDs match.
  for (const id of requiredToolCallIds) {
    if (!providedToolCallIds.has(id)) {
        console.warn(`[Agent Service /run] Detected mismatched tool ID in sequence: ${id}. Sanitizing messages.`);
        return messages.slice(0, lastAssistantMsgIndex);
    }
  }

  // If all checks pass, the history is valid.
  return messages;
} 