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
  // 1. First, create a set of all available tool result IDs from the entire history for efficient lookup.
  const allProvidedToolResultIds = new Set<string>();
  messages.forEach(message => {
    // In UIMessages, results are not in `role: 'tool'` messages. They are part of
    // assistant messages in the `parts` and `toolInvocations` arrays, identified by `state: 'result'`.

    // Check `parts` array for tool results
    const uiParts = (message as any).parts ?? [];
    uiParts.forEach((part: any) => {
      if (part.type === 'tool-invocation' && part.toolInvocation?.state === 'result' && part.toolInvocation?.toolCallId) {
        allProvidedToolResultIds.add(part.toolInvocation.toolCallId);
  }
    });

    // Also check the top-level `toolInvocations` array for results
    const invocations = (message as any).toolInvocations ?? [];
    invocations.forEach((invocation: any) => {
      if (invocation.state === 'result' && invocation.toolCallId) {
        allProvidedToolResultIds.add(invocation.toolCallId);
      }
    });
  });

  // 2. Iterate through the messages and build a new, sanitized list.
  const sanitizedMessages: Message[] = [];
  for (const message of messages) {
    // We only need to validate assistant messages that contain tool calls.
    if (message.role !== 'assistant') {
      sanitizedMessages.push(message);
      continue;
    }

    // Find all tool calls required by this specific assistant message.
    const uiParts = (message as any).parts ?? [];
    const partsToolCalls = uiParts
      .filter((part: any) => part.type === 'tool-invocation' && part.toolInvocation?.toolCallId)
      .map((part: any) => part.toolInvocation.toolCallId) as string[];
    const invocationToolCalls = ((message as any).toolInvocations ?? [])
      .map((tool: any) => tool.toolCallId)
      .filter(Boolean) as string[];
    const requiredToolCallIds = new Set([...partsToolCalls, ...invocationToolCalls]);

    // If this assistant message doesn't call any tools, it's safe.
  if (requiredToolCallIds.size === 0) {
      sanitizedMessages.push(message);
      continue;
    }

    // 3. Check if every required tool call has a corresponding result somewhere in the history.
    let isMessageValid = true;
    for (const requiredId of requiredToolCallIds) {
      if (!allProvidedToolResultIds.has(requiredId)) {
        const contentPreview = typeof message.content === 'string' 
          ? message.content.substring(0, 100) 
          : 'N/A (non-string content)';
        console.warn(`[Sanitizer] Removing message with ID ${message.id} due to incomplete tool call '${requiredId}'. Content starts: "${contentPreview}..."`);
        isMessageValid = false;
        break; // One bad call invalidates the whole message.
      }
    }

    // Add the message to our clean list ONLY if it's valid.
    if (isMessageValid) {
      sanitizedMessages.push(message);
    }
  }

  return sanitizedMessages;
} 