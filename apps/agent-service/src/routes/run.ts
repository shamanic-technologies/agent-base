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
    AgentBaseCreditStreamPayload
} from '@agent-base/types';
// AI SDK imports
import { anthropic } from '@ai-sdk/anthropic';
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
    deductCreditByPlatformUserIdInternalService
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
        const streamData = new StreamData(); // Instantiate StreamData

        // --- Extraction & Validation ---
        const { message: currentMessage, conversationId } = req.body;
        const clientUserId = req.clientUserId;
        const clientOrganizationId = req.clientOrganizationId;
        const platformUserId = req.platformUserId;
        const platformApiKey = req.headers['x-platform-api-key'] as string;

        if (!clientUserId || !clientOrganizationId || !platformUserId || !platformApiKey || !currentMessage || !conversationId) {
            let errorDetail = !clientUserId ? 'Missing x-client-user-id' :
                                !clientOrganizationId ? 'Missing x-organization-id':
                                !platformUserId ? 'Missing x-platform-user-id' :
                                !platformApiKey ? 'Missing x-platform-api-key' :
                                                'Missing message or conversationId';
            return res.status(400).json({
                success: false,
                error: `Bad Request: ${errorDetail}`
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
        if (!agentResponse.success || !agentResponse.data) {
            console.error(`[Agent Service /run] Failed to get agent for conversation ${conversationId}:`, agentResponse.error);
            return res.status(500).json({ success: false, error: `Failed to load agent configuration: ${agentResponse.error}` });
        }
        const agent: Agent = agentResponse.data;

        // --- Construct System Prompt ---
        const systemPrompt = buildSystemPrompt(agent);

        // --- Get Conversation & History (Full) ---
        let fullHistoryMessages: Message[] = [];
        const conversationResponse = await getConversationByIdInternalApiService(
            { conversationId },
            platformUserId,
            platformApiKey,
            clientUserId,
            clientOrganizationId
        );
        if (conversationResponse.success && conversationResponse.data?.messages) {
            fullHistoryMessages = conversationResponse.data.messages;
        } else {
            console.warn(`[Agent Service /run] Conversation ${conversationId} not found or no messages present. Starting with empty history. Error: ${conversationResponse.error}`);
        }

        // --- Truncate History ---
        const totalModelLimit = 200000;
        const maxOutputTokens = 4096;
        const thinkingBudgetTokens = 12000;

        const selectedHistoryMessages = truncateHistory({
            systemPrompt,
            currentMessage,
            fullHistoryMessages,
            totalModelLimit,
            maxOutputTokens,
            thinkingBudgetTokens,
        });

        // --- Prepare Credentials for API Client ---
        const agentServiceCredentials: AgentInternalCredentials = {
            clientUserId: clientUserId,
            clientOrganizationId: clientOrganizationId,
            platformApiKey: platformApiKey,
            platformUserId: platformUserId,
            agentId: agent.id
        };

        // --- Dynamically Load and Prepare Tools ---
        const startupToolIds = [
            'webhook_create_webhook', 'webhook_search_webhooks', 'webhook_link_user', 'webhook_link_agent', 'webhook_get_latest_events',
            'create_api_tool',
            'utility_google_search', 'utility_google_maps', 'utility_get_current_datetime', 'utility_read_webpage', 'utility_curl_command',
            'update_agent_memory', 'get_actions'
        ];

        const fetchedFunctionalTools = await Promise.all(
            startupToolIds.map(id => createFunctionalToolObject(id, agentServiceCredentials, conversationId))
        );
        
        const allStartupTools: Record<string, Tool> = {
            utility_list_utilities: createListUtilitiesTool(agentServiceCredentials, conversationId),
            utility_get_utility_info: createGetUtilityInfoTool(agentServiceCredentials, conversationId),
            utility_call_utility: createCallUtilityTool(agentServiceCredentials, conversationId),
        };

        fetchedFunctionalTools.forEach(item => {
            allStartupTools[item.id] = item.tool;
        });

        // --- Combine Messages ---
        const allMessages: Message[] = appendClientMessage({
            messages: selectedHistoryMessages,
            message: currentMessage
        });

        // --- Call AI Model ---
        const result = await streamText({
            model: anthropic(ModelName.CLAUDE_SONNET_4_20250514),
            messages: allMessages as any[],
            system: systemPrompt, 
            tools: allStartupTools,
            toolCallStreaming: true,
            maxTokens: maxOutputTokens,
            temperature: 0.1,
            maxSteps: 25, 
            providerOptions: { anthropic: { thinking: { type: 'enabled', budgetTokens: thinkingBudgetTokens } } },
            experimental_generateMessageId: createIdGenerator({ prefix: 'msgs', size: 16 }),
            async onFinish({ response, usage }) {
                try {
                    let messagesToSave = [...fullHistoryMessages, currentMessage];
                    messagesToSave = appendResponseMessages({
                        messages: messagesToSave,
                        responseMessages: response.messages
                    });

                    await updateConversationInternalApiService(
                        { conversationId: conversationId, messages: messagesToSave },
                        platformUserId,
                        platformApiKey,
                        clientUserId,
                        clientOrganizationId
                    );
                } catch (dbError) {
                    console.error("[Agent Service /run] Exception saving messages in onFinish:", dbError);
                }

                const assistantMessageId = response.messages[response.messages.length - 1].id;
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

                    if (deductCreditResponse.success && deductCreditResponse.data) {
                        const { creditConsumption, newBalanceInUSDCents } = deductCreditResponse.data;
                        const creditData: AgentBaseCreditStreamPayloadData = {
                            creditConsumption,
                            newBalanceInUSDCents,
                            assistantMessageId,
                        };
                        streamData.append(JSON.stringify({ type: 'credit_info', success: true, data: creditData }));
                    } else {
                        const creditData: AgentBaseCreditStreamPayloadData = { assistantMessageId };
                        streamData.append(JSON.stringify({ type: 'credit_info', success: false, error: 'Failed to deduct credit', details: deductCreditResponse.error, data: creditData }));
                    }
                } catch (deductCreditError) {
                    const creditData: AgentBaseCreditStreamPayloadData = { assistantMessageId };
                    const details = deductCreditError instanceof Error ? deductCreditError.message : String(deductCreditError);
                    streamData.append(JSON.stringify({ type: 'credit_info', success: false, error: 'Exception during credit deduction', details, data: creditData }));
                } finally {
                    streamData.close();
                }
            },
        });

        result.consumeStream();
        await result.pipeDataStreamToResponse(res, { data: streamData });

    })().catch(next);
});

export default runRouter; 