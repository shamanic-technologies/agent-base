/**
 * @fileoverview
 * This file contains utility functions for intelligently merging message histories.
 */

// AI SDK imports
import { Message } from 'ai';

/**
 * Merges a trusted message history from a database with a potentially newer
 * history from a client. It finds the last common message and appends only
 * the new messages from the client.
 *
 * @param dbMessages - The trusted array of messages from the database.
 * @param clientMessages - The potentially more recent array of messages from the client.
 * @returns A new, merged array of messages.
 */
export function mergeMessages(
  dbMessages: Message[],
  clientMessages: Message[]
): Message[] {
  if (dbMessages.length === 0) {
    return clientMessages;
  }

  const lastDbMessageId = dbMessages[dbMessages.length - 1].id;
  const lastDbMessageIndexInClient = clientMessages.findIndex(
    (msg) => msg.id === lastDbMessageId
  );

  let newMessagesFromClient: Message[] = [];

  if (lastDbMessageIndexInClient !== -1) {
    // If a common ancestor is found, append the messages that came after it.
    newMessagesFromClient = clientMessages.slice(lastDbMessageIndexInClient + 1);
  } else {
    // If no common ancestor is found (which is unusual), it's safest to
    // just append the very last message from the client to avoid state confusion.
    newMessagesFromClient = [clientMessages[clientMessages.length - 1]];
  }

  return [...dbMessages, ...newMessagesFromClient] as Message[];
} 