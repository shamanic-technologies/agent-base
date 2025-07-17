/**
 * @fileoverview
 * This file contains utility functions for sanitizing message reasoning
 * to prevent errors with AI model providers.
 */

import { Message } from 'ai';

/**
 * Removes reasoning parts from a message history that are missing a signature.
 * The Anthropic API requires that all reasoning parts have a signature.
 *
 * @param messages - The array of messages to sanitize.
 * @returns A new array of messages with any invalid reasoning parts removed.
 */
export function sanitizeReasoning(messages: Message[]): Message[] {
    return messages.map(message => {
        if (message.role === 'assistant' && Array.isArray(message.content)) {
            return {
                ...message,
                content: message.content.filter(part => {
                    // Filter out reasoning parts that are missing a signature.
                    if (part.type === 'reasoning') {
                        return (part as any).signature != null && (part as any).signature !== '';
                    }
                    // Always filter out redacted reasoning parts as they don't have signatures.
                    if (part.type === 'redacted-reasoning') {
                        return false;
                    }
                    // Keep all other parts.
                    return true;
                }),
            };
        }
        return message;
    }) as any[];
} 