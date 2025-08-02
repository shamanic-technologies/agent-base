// import { Router, Request, Response, NextFunction } from "express";
// import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
// import {
//   ServiceResponse,
//   Agent,
//   ConversationLanggraph,
//   AgentBaseDeductCreditRequest,
//   AgentInternalCredentials,
// } from "@agent-base/types";
// import {
//   getAgentFromConversation,
//   getConversationByIdLangGraphInternalApiService,
//   updateConversationLangGraphInternalApiService,
//   deductCreditByPlatformUserIdInternalService,
// } from "@agent-base/api-client";
// import {
//   mergeMessages,
//   sanitizeIncompleteToolCalls,
// } from "../lib/lang-graph/message-utils.js";
// import { truncateHistory } from "../lib/lang-graph/history-truncation.js";
// import { buildSystemPrompt } from "../lib/promptBuilder.js";
// import { agentExecutor } from "../lib/lang-graph/langgraph-app.js";
// import { Message } from "ai";

// const router = Router();

// function convertToLangChainMessages(messages: (Message | any)[]): BaseMessage[] {
//   return messages.map((msg) => {
//     const content = msg.content ?? msg.kwargs?.content ?? "";

//     if (msg.id && Array.isArray(msg.id)) {
//       const type = msg.id[msg.id.length - 1];
//       switch (type) {
//         case "HumanMessage":
//           return new HumanMessage({ content });
//         case "AIMessage":
//         case "AIMessageChunk":
//           return new AIMessage({ content });
//       }
//     }

//     if (msg.role === "user") {
//       return new HumanMessage({ content });
//     } else if (msg.role === "assistant" || msg.role === "system") {
//       return new AIMessage({ content });
//     }

//     console.warn("[LangGraph] Unknown message format, defaulting to HumanMessage:", msg);
//     return new HumanMessage({ content });
//   });
// }

// router.post(
//   "/run/langgraph",
//   (req: Request, res: Response, next: NextFunction): void => {
//     (async () => {
//       try {
//         const { messages, conversationId } = req.body;

//         const clientUserId = req.clientUserId as string;
//         const clientOrganizationId = req.clientOrganizationId as string;
//         const platformUserId = req.platformUserId as string;
//         const platformApiKey = req.headers["x-platform-api-key"] as string;

//         if (
//           !clientUserId ||
//           !clientOrganizationId ||
//           !platformUserId ||
//           !platformApiKey ||
//           !messages ||
//           !conversationId
//         ) {
//           return res.status(400).json({ error: "Missing required fields" });
//         }

//         const agentResponse: ServiceResponse<Agent> =
//           await getAgentFromConversation(
//             { conversationId },
//             clientUserId,
//             clientOrganizationId,
//             platformUserId,
//             platformApiKey,
//           );
//         if (!agentResponse.success) {
//           return res.status(500).json({ error: "Failed to load agent" });
//         }
//         const agent: Agent = agentResponse.data;

//         const systemPrompt: string = buildSystemPrompt(agent);

//         const fullHistoryFromDBResponse: ServiceResponse<ConversationLanggraph> =
//           await getConversationByIdLangGraphInternalApiService(
//             { conversationId },
//             platformUserId,
//             platformApiKey,
//             clientUserId,
//             clientOrganizationId,
//           );
//         if (!fullHistoryFromDBResponse.success) {
//           return res.status(500).json({ error: "Failed to load history" });
//         }
//         const dbHistory = fullHistoryFromDBResponse.data.messages;

//         const langChainDbHistory = convertToLangChainMessages(dbHistory);
//         const langChainRequestMessages = convertToLangChainMessages(messages);

//         const mergedMessages: BaseMessage[] = mergeMessages(
//           langChainDbHistory,
//           langChainRequestMessages,
//         );

//         const inputTokensBudget = 20000;
//         const thinkingBudgetTokens = 1024;

//         const truncatedMessages: BaseMessage[] = await truncateHistory(
//           systemPrompt,
//           mergedMessages,
//           inputTokensBudget,
//           thinkingBudgetTokens,
//         );

//         const sanitizedMessages: BaseMessage[] =
//           sanitizeIncompleteToolCalls(truncatedMessages);

//         const agentServiceCredentials: AgentInternalCredentials = {
//           clientUserId,
//           clientOrganizationId,
//           platformApiKey,
//           platformUserId,
//           agentId: agent.id,
//         };
        
//         const eventStream = await agentExecutor.getStream(
//           {
//             messages: sanitizedMessages,
//             inputTokens: 0,
//             outputTokens: 0,
//           },
//           {
//             configurable: {
//               thread_id: conversationId,
//               ...agentServiceCredentials,
//             },
//           },
//         );

//         res.setHeader("Content-Type", "text/event-stream");
//         res.setHeader("Cache-Control", "no-cache");
//         res.setHeader("Connection", "keep-alive");

//         let finalState: any = null;

//         for await (const event of eventStream) {
//           if (event.event === "on_chain_end") {
//             finalState = event.data.output;
//           }
//           res.write(`data: ${JSON.stringify(event)}\n\n`);
//         }
//         res.end();

//         if (finalState && Array.isArray(finalState.messages)) {
//           const messagesToSave = finalState.messages;

//           await updateConversationLangGraphInternalApiService(
//             { 
//               conversationId, 
//               messages: messagesToSave as any, 
//               langGraphThreadId: null 
//             },
//             platformUserId,
//             platformApiKey,
//             clientUserId,
//             clientOrganizationId,
//           );

//           const deductCreditRequest: AgentBaseDeductCreditRequest = {
//             toolCalls: [], 
//             inputTokens: finalState.inputTokens,
//             outputTokens: finalState.outputTokens,
//           };
//           await deductCreditByPlatformUserIdInternalService(
//             platformUserId,
//             platformApiKey,
//             clientUserId,
//             clientOrganizationId,
//             deductCreditRequest,
//           );
//         }
//       } catch (error) {
//         next(error);
//       }
//     })().catch(next);
//   },
// );

// export default router;
export {};
