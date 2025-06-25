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

  // If the assistant message content isn't an array, it can't contain standard tool calls,
  // but we must still check for the `toolInvocations` property used by the UI.
  const contentToolCalls = (Array.isArray(lastAssistantMsg.content)
    ? lastAssistantMsg.content
        .filter((part: any) => part.type === 'tool_call')
        .map((part) => (part as { toolCallId: string }).toolCallId)
    : []) as string[];
  
  // Also check for tool calls in the `toolInvocations` property, which is used by the Vercel AI SDK UI components.
  // This is the key change to handle messages coming from a `useChat` client.
  const invocationToolCalls = ((lastAssistantMsg as any).toolInvocations
    ? (lastAssistantMsg as any).toolInvocations
        .map((tool: any) => tool.toolCallId)
    : []) as string[];

  const requiredToolCallIds = new Set([...contentToolCalls, ...invocationToolCalls]);

  // If the last assistant message had no tool calls in either location, there's nothing to sanitize.
  if (requiredToolCallIds.size === 0) {
    return messages;
  }

  const subsequentToolMessages = messages.slice(lastAssistantMsgIndex + 1).filter((msg: any) => msg.role === 'tool');
  
  // According to the Vercel AI SDK documentation, the toolCallId for a tool result
  // is located inside the 'content' array. However, we also check for a backward-
  // compatible format where `toolCallId` is a top-level property.
  const providedToolCallIds = new Set<string>();
  subsequentToolMessages.forEach((msg: Message) => {
    // Check for the modern format where content is an array of tool results
    if (Array.isArray(msg.content)) {
      msg.content.forEach((part: any) => {
        // The `part` can be a string or an object. We only care about tool-result objects.
        if (typeof part === 'object' && part.type === 'tool-result' && part.toolCallId) {
          providedToolCallIds.add(part.toolCallId);
        }
      });
    }
    // Check for the backward-compatible format where toolCallId is a top-level property.
    // The type assertion is safe because we've already filtered for role: 'tool'.
    if ((msg as any).toolCallId) {
      providedToolCallIds.add((msg as any).toolCallId);
    }
  });
  
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