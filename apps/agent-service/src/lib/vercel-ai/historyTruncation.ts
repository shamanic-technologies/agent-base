// @ts-ignore - Message may not be directly exported from 'ai' in this context
import { Message } from 'ai';
import { countTokens } from '@anthropic-ai/tokenizer';


/**
 * Counts tokens for message content, handling string or array formats.
 * Specifically counts 'text' parts within array content.
 * Includes try-catch blocks for robustness in token counting.
 * @param content The message content, which can be a string or a readonly array of message parts.
 * @param context A descriptive string for logging, indicating what content is being tokenized (e.g., "system prompt").
 * @returns The calculated number of tokens, or 0 if token counting fails.
 */
export function countMessageContentTokens(
  content: string | ReadonlyArray<{ type: 'text'; text: string } | { type: string; [key: string]: any }>,
  context: string
): number {
  let tokens = 0;
  if (typeof content === 'string') {
    try {
      tokens = countTokens(content);
    } catch (e) {
      console.warn(`[HistoryTruncation] Failed to count tokens for ${context}, assuming 0 for safety. Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  } else if (Array.isArray(content)) {
    for (const part of content) {
      if (part.type === 'text') {
        try {
          tokens += countTokens(part.text);
        } catch (e) {
          console.warn(`[HistoryTruncation] Failed to count tokens for a text part of ${context}, assuming 0 for safety. Error: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
      // Note: Other content types (e.g., images, tools) are not tokenized by this function.
      // Token costs for such parts would need to be handled separately if applicable.
    }
  }
  return tokens;
}

/**
 * Truncates conversation history to fit within the specified model's context window.
 * This function prioritizes inclusion of the system prompt,
 * and the most recent historical messages, while adhering to token limits.
 *
 * @param systemPrompt - The system prompt string.
 * @param fullHistoryMessages - An array of all historical messages in the conversation.
 * @param inputTokensBudget - The total token limit for the model.
 * @param thinkingBudgetTokens - The token budget for thinking. Defaults to 0 if not provided.
 * @returns An array of `Message` objects representing the selected history messages that fit the calculated token budget.
 */
export function truncateHistory(
  systemPrompt: string,
  fullHistoryMessages: Message[],
  inputTokensBudget: number,
  thinkingBudgetTokens: number = 0,
): Message[] {
  console.log(`[HistoryTruncation] Input tokens budget: ${inputTokensBudget}.`);
  console.log(`[HistoryTruncation] Thinking budget tokens: ${thinkingBudgetTokens}.`);


  // Count tokens for the system prompt and the current user message.
  const systemPromptTokens = countMessageContentTokens(systemPrompt, "system prompt");
  // const currentUserMessageTokens = countMessageContentTokens(currentMessage.content, `current user message ID: ${currentMessage.id}`);
  console.log(`[HistoryTruncation] System prompt tokens: ${systemPromptTokens}.`);

  // Determine the remaining token budget for historical messages.
  // Ensure budget is not negative, and account for thinking budget.
  const historyTokensBudget = Math.max(0, inputTokensBudget - systemPromptTokens - thinkingBudgetTokens);
  console.log(`[HistoryTruncation] Remaining history tokens budget: ${historyTokensBudget}.`);

  const selectedHistoryMessages: Message[] = [];
  let currentHistoryTokens = 0;

  // Iterate through historical messages in reverse order (most recent first).
  for (let i = fullHistoryMessages.length - 1; i >= 0; i--) {
    const message = fullHistoryMessages[i];
    // Count tokens for the content of the current historical message.
    // Additional logic might be needed here if tool calls/responses in history also consume tokens.
    const messageTokens = countMessageContentTokens(message.content, `history message ID: ${message.id || `index ${i}`}`);
    
    // If the current message fits within the remaining budget, add it.
    if (currentHistoryTokens + messageTokens <= historyTokensBudget) {
      selectedHistoryMessages.unshift(message); // Add to the beginning to maintain chronological order
      currentHistoryTokens += messageTokens;
    } else {
      // If the message doesn't fit, stop adding older messages.
      break;
    }
  }
  
  console.log(`[HistoryTruncation] Token budget for history: ${historyTokensBudget}. Tokens used by selected history: ${currentHistoryTokens}. Original history messages: ${fullHistoryMessages.length}. Selected history messages: ${selectedHistoryMessages.length}.`);
  return selectedHistoryMessages;
} 