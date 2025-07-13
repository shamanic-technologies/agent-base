import { BaseMessage } from "@langchain/core/messages";
import { countMessageContentTokens } from "../vercel-ai/historyTruncation.js";

/**
 * Truncates message history to fit within a specified token budget,
 * using LangChain's BaseMessage type.
 *
 * @param systemPrompt The system prompt string.
 * @param messages The array of BaseMessage objects.
 * @param tokenBudget The maximum number of tokens allowed for the history.
 * @param thinkingBudget The number of tokens to reserve for the model's thinking process.
 * @returns A truncated array of BaseMessage objects.
 */
export async function truncateHistory(
  systemPrompt: string,
  messages: BaseMessage[],
  tokenBudget: number,
  thinkingBudget: number,
): Promise<BaseMessage[]> {
  const systemPromptTokens = countMessageContentTokens(
    systemPrompt,
    "system prompt",
  );
  const remainingBudget = tokenBudget - systemPromptTokens - thinkingBudget;

  let usedTokens = 0;
  const truncatedMessages: BaseMessage[] = [];

  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    const content = message.content;

    // The 'content' of a BaseMessage is a string | any[], which matches the expected type.
    const messageTokens = countMessageContentTokens(
      content as any, // Cast to any to satisfy the compiler, as the function handles both types.
      `history message role: ${(message as any).role}`,
    );

    if (usedTokens + messageTokens > remainingBudget) {
      break;
    }

    usedTokens += messageTokens;
    truncatedMessages.unshift(message);
  }

  return truncatedMessages;
} 