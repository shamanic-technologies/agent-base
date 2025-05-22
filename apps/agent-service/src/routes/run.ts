/**
 * Agent Run Route
 * 
 * Handles the core agent interaction logic via POST /run.
 */
import { Router, Request, Response, NextFunction } from 'express';
import {
    ServiceResponse,
    Agent,
    AgentServiceCredentials,
    DeductCreditRequest,
    DeductCreditResponse,
    ConversationId
} from '@agent-base/types';
// AI SDK imports
import { anthropic } from '@ai-sdk/anthropic';
import { streamText, StreamData } from 'ai';

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

const runRouter = Router(); // Use a specific router for this file

/**
 * Run agent interaction endpoint
 */
runRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const handleAgentRun = async () => {
    let currentMessage: Message;
    let conversationId: string;
    let clientUserId: string | undefined;
    let platformUserId: string | undefined;
    let platformApiKey: string | undefined;

    const streamData = new StreamData(); // Instantiate StreamData

    try {
      // --- Extraction & Validation ---
      ({ message: currentMessage, conversationId } = req.body);
      clientUserId = req.clientUserId;
      platformUserId = req.platformUserId;
      platformApiKey = req.headers['x-platform-api-key'] as string;

      if (!clientUserId || !platformUserId || !platformApiKey || !currentMessage || !conversationId) {
        console.error('[Agent Service /run] Missing required headers or body fields.');
        // Combine checks for brevity
        let errorDetail = !clientUserId ? 'Missing x-client-user-id' :
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
        clientUserId
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
      const agentServiceCredentials: AgentServiceCredentials = {
        clientUserId: clientUserId,
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
        // API Tools
          'create_api_tool',
        // Utility Tools
          'utility_google_search',
          'utility_google_maps',
          'utility_get_current_datetime',
          'utility_read_webpage',
          'utility_curl_command',
        // Agent Tools
          'update_agent_memory'
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

      // --- Call AI Model ---
      const result = await streamText({
        model: anthropic(agent.modelId),
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
        async onFinish({ response, toolCalls, usage }) { // Destructure response directly
            try {
              // Construct the final list including the latest assistant/tool responses
              // When saving, we should save the full original history plus the new interaction,
              // not just the truncated 'allMessages'.
              // The 'fullHistoryMessages' already contains the state before this interaction.
              // We append the 'currentMessage' (user's latest) and 'response.messages' (AI's reply).
              
              let messagesToSave = [...fullHistoryMessages, currentMessage];
              messagesToSave = appendResponseMessages({
                  messages: messagesToSave,
                  responseMessages: response.messages
              });

              const saveResult= await updateConversationInternalApiService(
                { conversationId: conversationId, messages: messagesToSave }, // Save complete, non-truncated history + new messages
                platformUserId,
                platformApiKey,
                clientUserId
              );

              if (!saveResult.success) {
                  console.error("[Agent Service /run] Error saving messages to DB in onFinish:", saveResult.error);
                  // Decide if this error should prevent credit deduction or be appended to streamData
                  // For now, logging and proceeding to credit deduction
              }

            } catch (dbError) {
              console.error("[Agent Service /run] Exception calling database service to save messages in onFinish:", dbError);
              // Log and proceed
            }

            try {
              // Deduct credit from the customer's balance
              const deductCreditRequest: DeductCreditRequest = {
                toolCalls: toolCalls,
                inputTokens: usage.promptTokens,
                outputTokens: usage.completionTokens
              };
              const deductCreditResponse: ServiceResponse<DeductCreditResponse> = await deductCreditByPlatformUserIdInternalService(
                platformUserId,
                platformApiKey,
                clientUserId,
                deductCreditRequest
              );

              if (deductCreditResponse.success && deductCreditResponse.data) {
                const { creditConsumption, newBalanceInUSDCents } = deductCreditResponse.data;
                streamData.append({
                    type: 'credit_info', // Custom type for client to identify this data
                    success: true,
                    data: {
                        // Stringify complex objects to ensure they are valid JSONValue
                        creditConsumption: JSON.stringify(creditConsumption),
                        newBalanceInUSDCents
                    }
                });
              } else {
                console.error("[Agent Service /run] Error deducting credit in onFinish (will append to stream):", deductCreditResponse.error);
                streamData.append({
                    type: 'credit_info',
                    success: false,
                    error: 'Failed to deduct credit',
                    details: deductCreditResponse.error
                });
              }
            } catch (deductCreditError) {
              console.error("[Agent Service /run] Exception deducting credit in onFinish (will append to stream):", deductCreditError);
              streamData.append({
                type: 'credit_info',
                success: false,
                error: 'Exception during credit deduction',
                details: deductCreditError instanceof Error ? deductCreditError.message : String(deductCreditError)
              });
            } finally {
                // This is crucial: always close streamData when onFinish is done with appending custom data.
                streamData.close();
            }
        },
      });
      // --- End Call AI Model ---
      // consume the stream to ensure it runs to completion & triggers onFinish
      // even when the client response is aborted:
      result.consumeStream(); // no await
      // --- Pipe Stream --- 
      await result.pipeDataStreamToResponse(res, {
        data: streamData, // Pass the StreamData instance here
        getErrorMessage: handleToolError
      });
      // --- End Pipe Stream ---

    } catch (error) {
       console.error("[Agent Service /run] Unhandled error in handleAgentRun:", error);
       // Ensure response isn't already sent before sending error
       if (!res.headersSent) {
           res.status(500).json({ success: false, error: 'Internal Server Error:' + error });
       }
       // Don't call next(error) if response is already sent, log instead.
       // next(error); // Avoid calling next if headers sent
    }
  };

  handleAgentRun().catch(next); // Keep this to catch promise rejections from handleAgentRun itself
});

export default runRouter; 