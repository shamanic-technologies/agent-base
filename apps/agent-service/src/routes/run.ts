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

// Import Mem0 Client
import { MemoryClient } from 'mem0ai';

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
    // Initialize Mem0 Client inside the handler
    // Ensure MEM0_API_KEY is set in your environment variables for the Mem0 Platform.
    const mem0 = new MemoryClient({
      apiKey: process.env.MEM0_API_KEY
    });

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

      // --- Retrieve Memories from Mem0 ---
      let retrievedMemoriesContent = '';
      if (clientUserId && currentMessage.content && agent.id) {
        try {
          console.log(`[Agent Service /run] Attempting to retrieve memories for user (clientUserId) ${clientUserId}, agentId ${agent.id}`);
          const searchOptions: any = { // Using 'any' for SearchOptions due to evolving SDK structure, refine if strict type is available
            user_id: clientUserId,    // User context for the search
            // threshold: 0.7,      // Optional: Minimum similarity score
            limit: 5,               // Optional: Limit number of results
            api_version: 'v2'       // Necessary for using filters
          };

          if (agent.id) {
            searchOptions.filters = {
              AND: [{ agent_id: agent.id }] // Filter by agent_id if available
            };
          }

          // Expect search to return an object like { results: [memoryEntry, ...] }
          const mem0SearchResponse = await mem0.search(
            currentMessage.content as string,
            searchOptions
          );

          // Safely access results
          // @ts-ignore - Assuming mem0.search returns { results: [] } as per richer Mem0 docs;
          // linter might be using incomplete/older types for mem0ai where it expects Memory[] directly.
          const relevantMemories = mem0SearchResponse?.results;

          if (relevantMemories && Array.isArray(relevantMemories) && relevantMemories.length > 0) {
            retrievedMemoriesContent = relevantMemories
              .map((entry: any) => `- ${entry.memory || "Memory content not found"}`) // Access the 'memory' field from each entry
              .join('\\n');
            console.log(`[Agent Service /run] Retrieved memories for user (clientUserId) ${clientUserId}, agentId ${agent.id}:\\n${retrievedMemoriesContent}`);
          } else {
            console.log(`[Agent Service /run] No relevant memories found for user (clientUserId) ${clientUserId}, agentId ${agent.id}`);
          }
        } catch (memError) {
          console.error(`[Agent Service /run] Error retrieving memories from Mem0 for user (clientUserId) ${clientUserId}, agentId ${agent.id}:`, memError);
        }
      }
      // --- End Retrieve Memories from Mem0 ---

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
        thinkingBudgetTokens,
        retrievedMemoriesContent
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

      // --- Incorporate Retrieved Memories into Messages (if any) ---
      // Option 1: Add as a new system message (if not already too many system messages)
      // Option 2: Prepend to the existing system prompt
      // Option 3: Add as part of the user's current message context (less ideal)
      // Choosing Option 2 for now: Prepending to the system prompt.
      let finalSystemPrompt = systemPrompt;
      if (retrievedMemoriesContent) {
        finalSystemPrompt = `Relevant past interactions and preferences (for context only, do not directly reference unless asked):\n${retrievedMemoriesContent}\n\n${systemPrompt}`;
        console.log(`[Agent Service /run] System prompt updated with memories.`);
      }
      // --- End Incorporate Retrieved Memories ---

      // --- Call AI Model ---
      const result = await streamText({
        model: anthropic(ModelName.CLAUDE_SONNET_4_20250514), //anthropic(agent.modelId),
        messages: allMessages as any[], // allMessages already includes the current user message
        system: finalSystemPrompt, // Use the potentially augmented system prompt
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
        async onFinish({ response, usage }) { // Reverted to { response, usage }
            // @ts-ignore - Vercel AI SDK streamText.onFinish result obj should contain responseMessages & usage.
            // Linter suggests incorrect type for 'result', but usage aligns with documentation.
            try {
              // Construct the final list including the latest assistant/tool responses
              // When saving, we should save the full original history plus the new interaction,
              // not just the truncated 'allMessages'.
              // The 'fullHistoryMessages' already contains the state before this interaction.
              // We append the 'currentMessage' (user's latest) and now 'response.messages' (AI's reply).
              
              console.debug('⭐️ [Agent Service /run backend onFinish] Raw response messages:', JSON.stringify(response?.messages, null, 2)); // Use response.messages, add optional chaining
              let messagesToSaveToDB = [...fullHistoryMessages, currentMessage];
              messagesToSaveToDB = appendResponseMessages({
                  messages: messagesToSaveToDB,
                  responseMessages: response.messages // Use response.messages here
              });

              const saveResult= await updateConversationInternalApiService(
                { conversationId: conversationId, messages: messagesToSaveToDB }, // Save complete, non-truncated history + new messages
                platformUserId,
                platformApiKey,
                clientUserId,
                clientOrganizationId
              );

              if (!saveResult.success) {
                  console.error("[Agent Service /run] Error saving messages to DB in onFinish:", saveResult.error);
                  // Decide if this error should prevent credit deduction or be appended to streamData
                  // For now, logging and proceeding to credit deduction
              } else {
                // --- Store Interaction in Mem0 ---
                if (clientUserId && currentMessage.content && response.messages && response.messages.length > 0) { // Use response.messages
                  try {
                    // Mem0 expects an array of messages.
                    // We'll store the user's current message and the assistant's final response(s).
                    // The structure for adding memories typically involves roles and content.
                    const messagesForMem0: Array<{ role: 'user' | 'assistant'; content: string }> = [];
                    const metadata: { user_id: string; agent_id?: string; conversation_id?: string } = {
                        user_id: clientUserId
                    };
                    if (agent.id) {
                        metadata.agent_id = agent.id;
                    }
                    if (conversationId) {
                        metadata.conversation_id = conversationId;
                    }

                    // Add user's current message
                    if (typeof currentMessage.content === 'string') {
                        messagesForMem0.push({ role: 'user', content: currentMessage.content });
                    } else if (Array.isArray(currentMessage.content)) {
                        // @ts-ignore - Workaround for persistent TS error (Property 'forEach' does not exist on type 'never'). 
                        // This indicates a potential issue in the local TS environment or complex type inference problem.
                        // The iteration logic itself is consistent with Vercel AI SDK's MessageContentPart structure.
                        currentMessage.content.forEach(part => {
                            if (part.type === 'text') {
                                messagesForMem0.push({ role: 'user', content: part.text });
                            }
                        });
                    }
                    
                    // Add assistant's response messages
                    // Temporary workaround for persistent linter error, investigate type resolution further.
                    if (Array.isArray(response.messages)) { // Use response.messages
                        (response.messages as Message[]).forEach(assistantMsg => { // Use response.messages
                            if (assistantMsg.role === 'assistant') {
                                if (typeof assistantMsg.content === 'string') {
                                    messagesForMem0.push({ role: 'assistant', content: assistantMsg.content });
                                } else if (Array.isArray(assistantMsg.content)) {
                                    // Handle multi-part assistant messages (text parts only for memory)
                                     // @ts-ignore - Workaround for persistent TS error (Property 'forEach' does not exist on type 'never'). 
                                     // Logic aligns with Vercel AI SDK MessageContentPart structure for array content.
                                      assistantMsg.content.forEach(part => {
                                          if (part.type === 'text') {
                                              messagesForMem0.push({ role: 'assistant', content: part.text });
                                          }
                                      });
                                }
                            }
                        });
                    }

                    if (messagesForMem0.length > 0) {
                        console.log(`[Agent Service /run] Attempting to add interaction to Mem0 for user (clientUserId) ${clientUserId}. Messages:`, JSON.stringify(messagesForMem0), 'Metadata:', JSON.stringify(metadata));
                        // Pass messages and an object with user_id and metadata for the add call
                        await mem0.add(messagesForMem0, { user_id: clientUserId, metadata });
                        console.log(`[Agent Service /run] Successfully added interaction to Mem0 for user (clientUserId) ${clientUserId} with metadata.`);
                    }
                  } catch (memError) {
                    console.error(`[Agent Service /run] Error adding interaction to Mem0 for user (clientUserId) ${clientUserId} with metadata:`, memError);
                    // Log and continue, as this shouldn't block the main flow.
                  }
                }
                // --- End Store Interaction in Mem0 ---
              }

            } catch (dbError) {
              console.error("[Agent Service /run] Exception calling database service to save messages in onFinish:", dbError);
              // Log and proceed
            }

            // Find the assistant's response message ID
            const assistantMessageId = response.messages[response.messages.length - 1].id; // Use response.messages

            // Manually extract tool calls from response.messages as a workaround
            const extractedToolCalls: ToolCall<string, string>[] = (response?.messages ?? []) // Use response.messages, keep nullish coalescing
                .flatMap(message => (message.role === 'assistant' && Array.isArray(message.content)) ? message.content : [])
                .filter(contentPart =>(contentPart as any).type === 'tool-call')
                .map(toolCallContent => ({
                    toolCallId: (toolCallContent as any).toolCallId,
                    toolName: (toolCallContent as any).toolName,
                    args: (toolCallContent as any).args,
                })
                )
                ;

            console.debug('⭐️ [Agent Service /run backend onFinish] Extracted tool calls:', JSON.stringify(extractedToolCalls, null, 2));

            try {
              // Deduct credit from the customer's balance
              const deductCreditRequest: AgentBaseDeductCreditRequest = {
                toolCalls: extractedToolCalls, // Use the manually extracted tool calls
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
                const { creditConsumption, newBalanceInUSDCents } : AgentBaseDeductCreditResponse = deductCreditResponse.data;
                const creditData: AgentBaseCreditStreamPayloadData = {
                    creditConsumption: creditConsumption, // Stringify CreditConsumption
                    newBalanceInUSDCents,
                    assistantMessageId: assistantMessageId, // Use camelCase and ensure it can be undefined
                };
                const dataToAppend: AgentBaseCreditStreamPayload = {
                    type: 'credit_info',
                    success: true,
                    data: creditData
                };
                console.log('🔵 [Agent Service /run backend onFinish] Attempting to append credit_info to streamData. Data:', JSON.stringify(dataToAppend));
                streamData.append(JSON.stringify(dataToAppend)); // Cast to any to bypass strict JSONValue check for now, StreamData should handle it.
                console.log('🔵 [Agent Service /run backend onFinish] Successfully appended credit_info to streamData.');
              } else {
                const creditData: AgentBaseCreditStreamPayloadData = {
                  assistantMessageId: assistantMessageId, // Use camelCase and ensure it can be undefined
                };
                const dataToAppend: AgentBaseCreditStreamPayload = {
                    type: 'credit_info',
                    success: false,
                    error: 'Failed to deduct credit',
                    details: deductCreditResponse.error,
                    data: creditData
                };
                console.error("[Agent Service /run backend onFinish] Error deducting credit (will append to stream as error):", deductCreditResponse.error);
                streamData.append(JSON.stringify(dataToAppend)); // Cast to any for simplicity here too
              }
            } catch (deductCreditError) {
              const creditData: AgentBaseCreditStreamPayloadData = {
                assistantMessageId: assistantMessageId, // Use camelCase and ensure it can be undefined
              };
              const dataToAppend: AgentBaseCreditStreamPayload = {
                  type: 'credit_info',
                  success: false,
                  error: 'Exception during credit deduction',
                  details: deductCreditError instanceof Error ? deductCreditError.message : String(deductCreditError),
                  data: creditData
              };
              console.error("[Agent Service /run] Exception deducting credit in onFinish (will append to stream):", deductCreditError);
              streamData.append(JSON.stringify(dataToAppend)); // Cast to any for simplicity here too
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