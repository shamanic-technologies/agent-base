/**
 * Agent Run Route
 * 
 * Handles the core agent interaction logic via POST /run.
 */
import { Router, Request, Response, NextFunction } from 'express';
import {
    ServiceResponse,
    Agent,
    AgentInternalCredentials,
    AgentBaseDeductCreditRequest,
    AgentBaseDeductCreditResponse,
    AgentBaseCreditStreamPayloadData,
    AgentBaseCreditStreamPayload,
    InternalUtilityInfo,
    Conversation
} from '@agent-base/types';
// AI SDK imports
import { anthropic } from '@ai-sdk/anthropic';
// import { google } from '@ai-sdk/google';
import { streamText, StreamData, ToolCall } from 'ai';

// Import necessary API client functions
import {
    getAgentFromConversation,
    getConversationByIdInternalApiService,
    updateConversationInternalApiService,
    // Import the new tool creators from the api-client package
    createListUtilitiesTool,
    createGetUtilityInfoTool,
    createCallUtilityTool,
    createFunctionalToolObject,
    deductCreditByPlatformUserIdInternalService,
    listClientSideUtilitiesFromAgent
} from '@agent-base/api-client';

// @ts-ignore - createIdGenerator may not be directly exported
import { createIdGenerator } from 'ai';
// @ts-ignore - appendClientMessage may not be directly exported
import { appendClientMessage } from 'ai';
// @ts-ignore - appendResponseMessages may not be directly exported
import { appendResponseMessages } from 'ai';
// @ts-ignore - Message not directly exported from 'ai' in this context
import { Message } from 'ai';
// @ts-ignore - Module '"ai"' has no exported member 'Tool'.
import { Tool } from 'ai';

// Prompt Builder import
import { buildSystemPrompt } from '../lib/promptBuilder.js';
import { sanitizeIncompleteToolCalls } from '../lib/messageSanitizers.js';
import { mergeMessages } from '../lib/messageMerger.js';
import { loadAndPrepareTools } from '../lib/toolLoader.js';

// Import error handler
import { handleToolError } from '../lib/utils/errorHandlers.js';
import { truncateHistory } from '../lib/historyTruncation.js'; // Added for history truncation
import { ModelName } from '../types/index.js';

const runRouter = Router(); // Use a specific router for this file

/**
 * Run agent interaction endpoint
 */
runRouter.post('/', (req: Request, res: Response, next: NextFunction): void => {
    (async () => {
        try {
            const streamData = new StreamData(); // Instantiate StreamData

            // --- Extraction & Validation ---
            const { messages, conversationId } = req.body;
            const clientUserId = req.clientUserId;
            const clientOrganizationId = req.clientOrganizationId;
            const platformUserId = req.platformUserId;
            const platformApiKey = req.headers['x-platform-api-key'] as string;

            if (!clientUserId || !clientOrganizationId || !platformUserId || !platformApiKey || !messages || !conversationId) {
                let errorDetail = !clientUserId ? 'Missing x-client-user-id' :
                                    !clientOrganizationId ? 'Missing x-organization-id':
                                    !platformUserId ? 'Missing x-platform-user-id' :
                                    !platformApiKey ? 'Missing x-platform-api-key' :
                                                    'Missing messages array or conversationId';

                console.error(`[Agent Service /run] Bad Request: ${errorDetail}`);
                return res.status(400).json({
                    success: false,
                    error: `Bad Request: ${errorDetail}`,
                    hint: `This error should not happen. Please contact support.`
                });
            }

            // --- Get Agent Details ---
            const agentResponse: ServiceResponse<Agent> = await getAgentFromConversation(
                { conversationId },
                clientUserId,
                clientOrganizationId,
                platformUserId,
                platformApiKey
            );
            if (!agentResponse.success) {
                console.error(`[Agent Service /run] Failed to get agent for conversation ${conversationId}:`, agentResponse.error);
                return res.status(500).json({
                    success: false,
                    error: `Failed to load agent configuration: ${agentResponse.error}`,
                    hint: `This error should not happen. Please contact support.`
                });
            }
            const agent: Agent = agentResponse.data;

            // --- Construct System Prompt ---
            const systemPrompt : string = buildSystemPrompt(agent);

            // The history now comes directly from the request body, no need to fetch.
            // We only fetch the full history later for saving.
            const fullHistoryFromDBResponse : ServiceResponse<Conversation> = await getConversationByIdInternalApiService(
                { conversationId },
                platformUserId,
                platformApiKey,
                clientUserId,
                clientOrganizationId
            );

            if (!fullHistoryFromDBResponse.success) {
                console.error(`[Agent Service /run] Failed to get conversation ${conversationId}:`, fullHistoryFromDBResponse.error);
                return res.status(500).json({
                    success: false,
                    error: `Failed to load conversation history: ${fullHistoryFromDBResponse.error}`,
                    hint: `This error should not happen. Please contact support.`
                });
            }

            const dbHistory : Message[] = fullHistoryFromDBResponse.data.messages;
            
            // 1. Merge to get the most complete history.
            const mergedMessages : Message[] = mergeMessages(dbHistory, messages);

            // 3. Truncate history to fit within the context window.
            const maxSteps = 10;
            const inputTokensBudget = 15000;
            const thinkingBudgetTokens = 10000;
            const maxOutputTokens = 40000;

            const truncatedMessages : Message[] = truncateHistory(
                systemPrompt, 
                mergedMessages, 
                inputTokensBudget, 
                thinkingBudgetTokens
            );

            // 2. Sanitize the merged history to prevent crashes from incomplete tool calls.
            const sanitizedMessages : Message[] = sanitizeIncompleteToolCalls(truncatedMessages);

            
            // 4. Dynamically Load and Prepare Tools
            const agentServiceCredentials: AgentInternalCredentials = {
                clientUserId: clientUserId,
                clientOrganizationId: clientOrganizationId,
                platformApiKey: platformApiKey,
                platformUserId: platformUserId,
                agentId: agent.id
            };

            const allStartupTools = await loadAndPrepareTools(agentServiceCredentials, conversationId);

            // --- Call AI Model ---
            const result = await streamText({
                model: anthropic(ModelName.CLAUDE_SONNET_4_20250514),
                // model: google('gemini-2.5-pro'),
                messages: sanitizedMessages,
                system: systemPrompt, 
                tools: allStartupTools,
                toolCallStreaming: true,
                maxTokens: maxOutputTokens,
                temperature: 0.1,
                maxSteps, 
                providerOptions: { anthropic: { thinking: { type: 'enabled', budgetTokens: thinkingBudgetTokens } } },
                experimental_generateMessageId: createIdGenerator({ prefix: 'msgs', size: 16 }),
                onError: (error) => {
                    console.error(`[Agent Service /run] Error:`, error, null, 2);
                    streamData.close();
                },
                async onFinish({ response, usage }) {
                    try {
                        const messagesToSave: Message[] = appendResponseMessages({
                            messages,
                            responseMessages: response.messages
                        });
                        // Save the final, complete conversation history to the database
                        await updateConversationInternalApiService(
                            { conversationId, messages: messagesToSave },
                            platformUserId,
                            platformApiKey,
                            clientUserId,
                            clientOrganizationId
                        );
                    } catch (dbError) {
                        console.error("[Agent Service /run] Exception saving messages in onFinish:", dbError);
                    }

                    const lastMessage = response.messages?.[response.messages.length - 1];
                    const assistantMessageId = lastMessage?.id ?? null; // In case there is no last message

                    const extractedToolCalls: ToolCall<string, any>[] = (response?.messages ?? [])
                        .flatMap(message => (message.role === 'assistant' && Array.isArray(message.content)) ? message.content : [])
                        .filter(contentPart => (contentPart as any).type === 'tool-call')
                        .map(toolCallContent => ({
                            toolCallId: (toolCallContent as any).toolCallId,
                            toolName: (toolCallContent as any).toolName,
                            args: (toolCallContent as any).args,
                        }));

                    try {
                        const deductCreditRequest: AgentBaseDeductCreditRequest = {
                            toolCalls: extractedToolCalls,
                            inputTokens: usage.promptTokens,
                            outputTokens: usage.completionTokens
                        };
                        const deductCreditResponse: ServiceResponse<AgentBaseDeductCreditResponse> = await deductCreditByPlatformUserIdInternalService(
                            platformUserId,
                            platformApiKey,
                            clientUserId,
                            clientOrganizationId,
                            deductCreditRequest
                        );

                        if (!deductCreditResponse.success) {
                            console.error(`[Agent Service /run] Failed to deduct credit:`, deductCreditResponse.error);
                            const creditData: AgentBaseCreditStreamPayloadData = { assistantMessageId };
                            streamData.append(JSON.stringify({ type: 'credit_info', success: false, error: 'Failed to deduct credit', details: deductCreditResponse.error, data: creditData }));
                            return;
                        }

                        const { creditConsumption, newBalanceInUSDCents } = deductCreditResponse.data;
                        const creditData: AgentBaseCreditStreamPayloadData = {
                            creditConsumption,
                            newBalanceInUSDCents,
                            assistantMessageId,
                        };
                        streamData.append(JSON.stringify({ type: 'credit_info', success: true, data: creditData }));
                    } catch (deductCreditError) {
                        const creditData: AgentBaseCreditStreamPayloadData = { assistantMessageId };
                        const details = deductCreditError instanceof Error ? deductCreditError.message : String(deductCreditError);
                        streamData.append(JSON.stringify({ type: 'credit_info', success: false, error: 'Exception during credit deduction', details, data: creditData }));
                    } finally {
                        streamData.close();
                    }
                },
            });

            // The stream needs to be consumed for the onFinish callback to execute.
            // We also need to catch any errors from this background consumption
            // to prevent an unhandled promise rejection from crashing the server.
            result.consumeStream().catch(err => {
              console.warn(`[Agent Service /run] Background stream consumption failed. This is expected if the main request fails. Error: ${err instanceof Error ? err.message : String(err)}`);
            });

            // Pipe the stream to the response. Any error thrown here will be caught
            // by the main .catch(next) block.
            await result.pipeDataStreamToResponse(res, { 
                data: streamData,
                sendReasoning: true,
            });
        } catch (error) {
            console.error('🔥🔥🔥 LOCAL TRY/CATCH IN /RUN CAUGHT AN ERROR 🔥🔥🔥', error);
            // Re-throw the error to be caught by the main .catch(next)
            throw error;
        }
    })().catch(next);
});

export default runRouter; 