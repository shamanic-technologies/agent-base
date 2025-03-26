/**
 * Model Output Formatters
 * 
 * Utility functions for formatting outputs from AI models into standardized formats.
 * These functions handle different content structures returned by various models (especially Claude).
 */

/**
 * Formats AI message content into a proper string representation
 * Handles different content formats (string, array of content blocks, etc.)
 * 
 * @param content - The message content to format
 * @returns A properly formatted string
 */
export function formatAIMessageContent(content: any): string {
  if (typeof content === 'string') {
    return content;
  } else if (Array.isArray(content)) {
    // Handle array of content blocks (Claude format)
    return content
      .filter(block => block && typeof block === 'object' && block.type === 'text')
      .map(block => block.text)
      .join('\n');
  } else {
    // Fallback for unexpected formats
    return JSON.stringify(content);
  }
}

/**
 * Formats tool response content for consistent display
 * 
 * @param toolResponse - The response from a tool call
 * @returns A properly formatted string
 */
export function formatToolResponse(toolResponse: any): string {
  if (typeof toolResponse === 'string') {
    return toolResponse;
  } else if (toolResponse === null || toolResponse === undefined) {
    return '';
  } else {
    // For objects and other complex types
    try {
      return JSON.stringify(toolResponse, null, 2);
    } catch (e) {
      return String(toolResponse);
    }
  }
} 