/**
 * @fileoverview
 * This file contains utility functions for sanitizing message content
 * to prevent errors with AI model providers.
 */

import { Message } from 'ai';

/**
 * Removes any message with empty content, except for the optional final assistant message.
 * The Anthropic API requires that all messages have content.
 *
 * @param messages - The array of messages to sanitize.
 * @returns A new array of messages with any empty messages removed.
 */
export function sanitizeEmptyMessages(messages: Message[]): Message[] {
    return messages.filter((message, index, array) => {
        // The final assistant message is allowed to be empty.
        if (message.role === 'assistant' && index === array.length - 1) {
            return true;
        }
        // All other messages must have content.
        if (Array.isArray(message.content)) {
            return message.content.length > 0;
        }
        if (typeof message.content === 'string') {
            return message.content.trim() !== '';
        }
        // Keep the message if content is not a string or array (should not happen with valid messages)
        return true;
    });
} 