import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  ToolMessage,
} from "@langchain/core/messages";

/**
 * Merges two arrays of messages, giving precedence to the second array
 * and removing duplicates based on message content and role.
 * @param baseMessages The base array of messages.
 * @param newMessages The new array of messages to merge.
 * @returns A single, deduplicated array of messages.
 */
export function mergeMessages(
  baseMessages: BaseMessage[],
  newMessages: BaseMessage[],
): BaseMessage[] {
  const merged = [...baseMessages];
  const mergedKeys = new Set(
    baseMessages.map((m) => `${(m as any).role}:${m.content}`),
  );

  for (const message of newMessages) {
    const key = `${(message as any).role}:${message.content}`;
    if (!mergedKeys.has(key)) {
      merged.push(message);
      mergedKeys.add(key);
    }
  }

  return merged;
}

/**
 * Sanitizes the last message in an array if it's an AIMessage with
 * incomplete tool calls.
 * @param messages An array of BaseMessage objects.
 * @returns A sanitized array of BaseMessage objects.
 */
export function sanitizeIncompleteToolCalls(
  messages: BaseMessage[],
): BaseMessage[] {
  if (messages.length === 0) {
    return [];
  }

  const lastMessage = messages[messages.length - 1];

  if (lastMessage._getType() === "ai") {
    const aiMessage = lastMessage as AIMessage;
    if (aiMessage.tool_calls) {
      const sanitizedToolCalls = (aiMessage.tool_calls ?? []).filter(
        (toolCall) => toolCall.name && toolCall.id,
      );

      if (sanitizedToolCalls.length < (aiMessage.tool_calls ?? []).length) {
        const newAIMessage = new AIMessage({
          ...aiMessage,
          tool_calls: sanitizedToolCalls,
        });
        return [...messages.slice(0, -1), newAIMessage];
      }
    }
  }

  return messages;
} 