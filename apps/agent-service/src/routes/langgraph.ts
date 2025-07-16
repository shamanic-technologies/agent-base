import { Router, Request, Response, NextFunction } from "express";
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import {
  ServiceResponse,
  Agent,
  Conversation,
  AgentBaseDeductCreditRequest,
  AgentInternalCredentials,
} from "@agent-base/types";
import {
  getAgentFromConversation,
  getConversationByIdInternalApiService,
  updateConversationInternalApiService,
  deductCreditByPlatformUserIdInternalService,
} from "@agent-base/api-client";
import { Tool } from "@langchain/core/tools";
import { ChatAnthropic } from "@langchain/anthropic";
import { createAgentWorkflow } from "../lib/lang-graph/langgraph-agent.js";
import { buildSystemPrompt } from "../lib/promptBuilder.js";
import {
  mergeMessages,
  sanitizeIncompleteToolCalls,
} from "../lib/lang-graph/message-utils.js";
import { truncateHistory } from "../lib/lang-graph/history-truncation.js";
import { loadLangGraphTools } from "../lib/lang-graph/tool-loader.js";
import { ModelName } from "../types/index.js";
import { Message } from "ai";

const router = Router();

function convertToLangChainMessages(
  messages: (Message | any)[],
): BaseMessage[] {
  return messages.map((msg) => {
    const content = msg.content ?? msg.kwargs?.content ?? "";
    // Handle serialized LangChain messages from the request body
    if (msg.id && Array.isArray(msg.id)) {
      const type = msg.id[msg.id.length - 1];
      if (type === "HumanMessage") {
        return new HumanMessage({ content });
      }
      if (type === "AIMessage") {
        return new AIMessage({ content });
      }
    }

    // Handle Vercel AI messages from the database
    if (msg.role === "user") {
      return new HumanMessage({ content });
    } else if (msg.role === "assistant" || msg.role === "system") {
      return new AIMessage({ content });
    }

    // Fallback for safety, though it should not be reached with proper data
    return new HumanMessage({ content });
  });
}

router.post(
  "/run/langgraph",
  (req: Request, res: Response, next: NextFunction): void => {
    (async () => {
      try {
        const { messages, conversationId } = req.body;
        const clientUserId = req.clientUserId as string;
        const clientOrganizationId = req.clientOrganizationId as string;
        const platformUserId = req.platformUserId as string;
        const platformApiKey = req.headers["x-platform-api-key"] as string;

        if (
          !clientUserId ||
          !clientOrganizationId ||
          !platformUserId ||
          !platformApiKey ||
          !messages ||
          !conversationId
        ) {
          return res.status(400).json({ error: "Missing required fields" });
        }

        const agentResponse: ServiceResponse<Agent> =
          await getAgentFromConversation(
            { conversationId },
            clientUserId,
            clientOrganizationId,
            platformUserId,
            platformApiKey,
          );
        if (!agentResponse.success) {
          return res.status(500).json({ error: "Failed to load agent" });
        }
        const agent: Agent = agentResponse.data;

        const systemPrompt: string = buildSystemPrompt(agent);

        const fullHistoryFromDBResponse: ServiceResponse<Conversation> =
          await getConversationByIdInternalApiService(
            { conversationId },
            platformUserId,
            platformApiKey,
            clientUserId,
            clientOrganizationId,
          );
        if (!fullHistoryFromDBResponse.success) {
          return res.status(500).json({ error: "Failed to load history" });
        }
        const dbHistory: Message[] = fullHistoryFromDBResponse.data.messages;

        const langChainDbHistory = convertToLangChainMessages(dbHistory);
        const langChainRequestMessages = convertToLangChainMessages(messages);

        const mergedMessages: BaseMessage[] = mergeMessages(
          langChainDbHistory,
          langChainRequestMessages,
        );

        const inputTokensBudget = 20000;
        const thinkingBudgetTokens = 1024;

        const truncatedMessages: BaseMessage[] = await truncateHistory(
          systemPrompt,
          mergedMessages,
          inputTokensBudget,
          thinkingBudgetTokens,
        );

        const sanitizedMessages: BaseMessage[] =
          sanitizeIncompleteToolCalls(truncatedMessages);

        const agentServiceCredentials: AgentInternalCredentials = {
          clientUserId,
          clientOrganizationId,
          platformApiKey,
          platformUserId,
          agentId: agent.id,
        };

        const langchainTools = await loadLangGraphTools(
          agentServiceCredentials,
          conversationId,
        );

        const model = new ChatAnthropic({
          model: ModelName.CLAUDE_SONNET_4_20250514,
          temperature: 0.1,
          clientOptions: {
            defaultHeaders: {
              "x-api-key": process.env.ANTHROPIC_API_KEY,
            },
          },
        });

        const boundModel = model.bindTools(langchainTools);

        const workflow = createAgentWorkflow(boundModel, langchainTools);

        const eventStream = await workflow.streamEvents(
          {
            messages: langChainRequestMessages,
            inputTokens: 0,
            outputTokens: 0,
          },
          { version: "v2" },
        );

        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        let finalState: any = null;

        for await (const event of eventStream) {
          if (event.event === "on_chain_end") {
            finalState = event.data.output;
          }
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        }
        res.end();

        // Save the final state for persistence
        if (finalState) {
          const messagesToSave: Partial<Message>[] = finalState.messages.map(
            (msg: BaseMessage) => ({
              role: (msg as any).role,
              content: msg.content,
            }),
          );

          await updateConversationInternalApiService(
            { conversationId, messages: messagesToSave },
            platformUserId,
            platformApiKey,
            clientUserId,
            clientOrganizationId,
          );

          const deductCreditRequest: AgentBaseDeductCreditRequest = {
            toolCalls: [], // TODO: Extract tool calls for credit deduction
            inputTokens: finalState.inputTokens,
            outputTokens: finalState.outputTokens,
          };
          await deductCreditByPlatformUserIdInternalService(
            platformUserId,
            platformApiKey,
            clientUserId,
            clientOrganizationId,
            deductCreditRequest,
          );
        }
        
        // Return the final state to the client
        // res.status(200).json(finalState); // This was causing the error

      } catch (error) {
        next(error);
      }
    })().catch(next);
  },
);

export default router; 