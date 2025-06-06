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
runRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const handleAgentRun = async () => {
    let currentMessage: Message;
    let conversationId: string;
    let clientUserId: string | undefined;
    let clientOrganizationId: string | undefined;
    let platformUserId: string | undefined;
    let platformApiKey: string | undefined;

    const streamData = new StreamData(); // Instantiate StreamData

    try {
      // --- Extraction & Validation ---
      ({ message: currentMessage, conversationId } = req.body);
      clientUserId = req.clientUserId;
      clientOrganizationId = req.clientOrganizationId;
      platformUserId = req.platformUserId;
      platformApiKey = req.headers['x-platform-api-key'] as string;

      if (!clientUserId || !clientOrganizationId || !platformUserId || !platformApiKey || !currentMessage || !conversationId) {
        console.error('[Agent Service /run] Missing required headers or body fields.');
        // Combine checks for brevity
        let errorDetail = !clientUserId ? 'Missing x-client-user-id' :
                          !clientOrganizationId ? 'Missing x-organization-id':
                          !platformUserId ? 'Missing x-platform-user-id' :
                          !platformApiKey ? 'Missing x-platform-api-key' :
                                            'Missing message or conversationId';
        res.status(400).json({
          success: false,
          error: `Bad Request: ${errorDetail}`,
          details: `clientUserId: ${clientUserId}, platformUserId: ${platformUserId}, platformApiKey: ${platformApiKey}, currentMessage: ${currentMessage}, conversationId: ${conversationId}`
         });
        return;
      }
      // --- End Extraction & Validation ---

      // --- Get Agent Details ---
      const agentResponse: ServiceResponse<Agent> = await getAgentFromConversation(
        { conversationId }, // Pass params object directly
        clientUserId,
        clientOrganizationId,
        platformUserId,
        platformApiKey
      );
      if (!agentResponse.success || !agentResponse.data) { // Check data presence too
          console.error(`[Agent Service /run] Failed to get agent for conversation ${conversationId}:`, agentResponse.error);
          res.status(500).json({ success: false, error: `Failed to load agent configuration: ${agentResponse.error}` });
          return;
      }
      const agent: Agent = agentResponse.data;
      // --- End Get Agent Details ---

      // --- Construct System Prompt ---
      const systemPrompt = buildSystemPrompt(agent);
      // --- End Construct System Prompt ---

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
          console.warn(`[Agent Service /run] Conversation ${conversationId} not found, error fetching, or no messages present. Starting with empty history. Error: ${conversationResponse.error}`);
      }
      // --- End Get Conversation & History (Full) ---

      // --- Truncate History using the new utility function ---
      const totalModelLimit = 200000; // Defined for clarity, passed to utility
      const maxOutputTokens = 4096;   // Defined for clarity, passed to utility
      const thinkingBudgetTokens = 12000; // Anthropic thinking budget

      const selectedHistoryMessages = truncateHistory({
        systemPrompt,
        currentMessage,
        fullHistoryMessages,
        totalModelLimit,
        maxOutputTokens,
        thinkingBudgetTokens, // Pass the thinking budget
        // safetyMargin: 0.90 // Using default from the function
      });
      // --- End Truncate History ---

      // --- Prepare Credentials for API Client ---
      const agentServiceCredentials: AgentInternalCredentials = {
        clientUserId: clientUserId,
        clientOrganizationId: clientOrganizationId,
        platformApiKey: platformApiKey,
        platformUserId: platformUserId,
        agentId: agent.id
      };
      // --- End Prepare Credentials ---


      // --- Dynamically Load and Prepare Tools ---
      const startupToolIds = [
        // Webhook Tools,
          'webhook_create_webhook',
          'webhook_search_webhooks',
          'webhook_link_user',
          'webhook_link_agent',
          'webhook_get_latest_events',
        // API Tools
          'create_api_tool',
        // Utility Tools
          'utility_google_search',
          'utility_google_maps',
          'utility_get_current_datetime',
          'utility_read_webpage',
          'utility_curl_command',
        // Agent Tools
          'update_agent_memory',
          'get_actions'
      ];

      // --- Fetch Functional Tools Concurrently ---
      let fetchedFunctionalTools: { id: string, tool: Tool }[] = [];
      try {
        fetchedFunctionalTools = await Promise.all(
            startupToolIds.map(id => createFunctionalToolObject(id, agentServiceCredentials, conversationId))
        );
      } catch (toolLoadError) {
          console.error("[Agent Service /run] Error loading startup functional tools:", toolLoadError);
          res.status(500).json({ success: false, error: `Failed to load required tools: ${toolLoadError instanceof Error ? toolLoadError.message : String(toolLoadError)}` });
          return;
      }
      // --- End Fetch Functional Tools ---


      // --- Assemble Final Tools Object ---
      const allStartupTools: Record<string, Tool> = {
          // Add Meta-Tools (synchronous creation)
          utility_list_utilities: createListUtilitiesTool(agentServiceCredentials, conversationId),
          utility_get_utility_info: createGetUtilityInfoTool(agentServiceCredentials, conversationId),
          utility_call_utility: createCallUtilityTool(agentServiceCredentials, conversationId),
      };

      // Add fetched functional tools using their IDs
      fetchedFunctionalTools.forEach(item => {
          allStartupTools[item.id] = item.tool;
      });
      // --- End Assemble Final Tools Object ---


      // --- Combine Messages ---
      const allMessages: Message[] = appendClientMessage({
        messages: selectedHistoryMessages, // Use truncated history from the utility function
        message: currentMessage
      });
      // --- End Combine Messages ---

      // --- Call AI Model & Handle Pre-Stream Errors ---
      try {
        const result = await streamText({
          model: anthropic(ModelName.CLAUDE_SONNET_4_20250514), //anthropic(agent.modelId),
          messages: allMessages as any[],
          system: systemPrompt,
          tools: allStartupTools,
          toolCallStreaming: true, // Enable streaming of partial tool calls
          maxTokens: maxOutputTokens, // Use the locally defined maxOutputTokens for the API call
          temperature: 0.1, // Moved to top-level
          maxSteps: 25,
          providerOptions: { anthropic: { thinking: { type: 'enabled', budgetTokens: thinkingBudgetTokens } } }, // Use the constant here too
          experimental_generateMessageId: createIdGenerator({
              prefix: 'msgs',
              size: 16,
          }),
          async onFinish({ response, usage }) {
            try {
              console.debug('⭐️ [Agent Service /run backend onFinish] Raw response messages:', JSON.stringify(response.messages, null, 2));
              let messagesToSave = [...fullHistoryMessages, currentMessage];
              messagesToSave = appendResponseMessages({
                  messages: messagesToSave,
                  responseMessages: response.messages
              });

              const saveResult= await updateConversationInternalApiService(
                { conversationId: conversationId, messages: messagesToSave },
                platformUserId,
                platformApiKey,
                clientUserId,
                clientOrganizationId
              );

              if (!saveResult.success) {
                  console.error("[Agent Service /run] Error saving messages to DB in onFinish:", saveResult.error);
              }

            } catch (dbError) {
              console.error("[Agent Service /run] Exception calling database service to save messages in onFinish:", dbError);
            }

            const assistantMessageId = response.messages[response.messages.length - 1].id;

            const extractedToolCalls: ToolCall<string, any>[] = (response?.messages ?? [])
                .flatMap(message => (message.role === 'assistant' && Array.isArray(message.content)) ? message.content : [])
                .filter(contentPart =>(contentPart as any).type === 'tool-call')
                .map(toolCallContent => ({
                    toolCallId: (toolCallContent as any).toolCallId,
                    toolName: (toolCallContent as any).toolName,
                    args: (toolCallContent as any).args,
                }));

            console.debug('⭐️ [Agent Service /run backend onFinish] Extracted tool calls:', JSON.stringify(extractedToolCalls, null, 2));

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

              console.log('🔵 [Agent Service /run backend onFinish] Deduct credit response:', JSON.stringify(deductCreditResponse));

              if (deductCreditResponse.success && deductCreditResponse.data) {
                const { creditConsumption, newBalanceInUSDCents } = deductCreditResponse.data;
                const creditData: AgentBaseCreditStreamPayloadData = {
                    creditConsumption: creditConsumption,
                    newBalanceInUSDCents,
                    assistantMessageId: assistantMessageId,
                };
                const dataToAppend: AgentBaseCreditStreamPayload = {
                    type: 'credit_info',
                    success: true,
                    data: creditData
                };
                streamData.append(JSON.stringify(dataToAppend));
              } else {
                const creditData: AgentBaseCreditStreamPayloadData = {
                  assistantMessageId: assistantMessageId,
                };
                const dataToAppend: AgentBaseCreditStreamPayload = {
                    type: 'credit_info',
                    success: false,
                    error: 'Failed to deduct credit',
                    details: deductCreditResponse.error,
                    data: creditData
                };
                streamData.append(JSON.stringify(dataToAppend));
              }
            } catch (deductCreditError) {
              const creditData: AgentBaseCreditStreamPayloadData = {
                assistantMessageId: assistantMessageId,
              };
              const dataToAppend: AgentBaseCreditStreamPayload = {
                  type: 'credit_info',
                  success: false,
                  error: 'Exception during credit deduction',
                  details: deductCreditError instanceof Error ? deductCreditError.message : String(deductCreditError),
                  data: creditData
              };
              streamData.append(JSON.stringify(dataToAppend));
            } finally {
                streamData.close();
            }
          },
        });

        result.consumeStream().catch(err => {
            console.warn(`[Agent Service /run] consumeStream caught a handled rejection. This is expected when an API error occurs and is handled by the main catch block. Error: ${err instanceof Error ? err.message : String(err)}`);
        });
        
        await result.pipeDataStreamToResponse(res, { data: streamData });

      } catch (error: any) {
        if (error.name === 'AI_APICallError' && !res.headersSent) {
            console.error(`[Agent Service /run] Caught pre-stream AI_APICallError: ${error.message}`);
            let statusCode = 500;
            let responseBody = { success: false, error: "An internal AI service error occurred." };

            const errorType = error.data?.error?.type;
            if (errorType === 'rate_limit_error') {
                statusCode = 429;
                responseBody = { success: false, error: "Rate limit exceeded. Please try again shortly." };
            } else if (errorType === 'invalid_request_error' && error.message.includes('prompt is too long')) {
                statusCode = 400;
                responseBody = { success: false, error: "The conversation history is too long to process. Please start a new conversation." };
            }
            return res.status(statusCode).json(responseBody);
        }
        
        console.error("[Agent Service /run] Unhandled error during agent run:", error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
      }
    } catch (error) {
       console.error("[Agent Service /run] Unhandled error in outer block:", error);
       if (!res.headersSent) {
           res.status(500).json({ success: false, error: 'Internal Server Error:' + error });
       }
    }
  };

  handleAgentRun().catch(next);
});

export default runRouter; 