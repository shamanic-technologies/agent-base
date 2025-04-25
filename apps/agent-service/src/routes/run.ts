/**
 * Agent Run Route
 * 
 * Handles the core agent interaction logic via POST /run.
 */
import { Router, Request, Response, NextFunction } from 'express';
import {
    ServiceResponse,
    Agent,
    UtilityToolCredentials,
    AgentServiceCredentials
} from '@agent-base/types';
// AI SDK imports
import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
// @ts-ignore - Message not directly exported from 'ai' in this context
import { Message } from 'ai';

// Import necessary API client functions - Use versions without ApiClient suffix where available
import { 
    getAgentFromConversation,
    getConversationInternalApiService, // Use this instead of getConversationByIdApiClient
    updateConversationInternalApiService, // Use this instead of updateConversationMessagesApiClient
} from '@agent-base/api-client';

// Tool Creator Imports
import { createListUtilitiesTool } from '../lib/utility/utility_list_utilities.js';
import { createGetUtilityInfoTool } from '../lib/utility/utility_get_utility_info.js';
import { createCallUtilityTool } from '../lib/utility/utility_call_utility.js';
// @ts-ignore - createIdGenerator is in the Vercel AI SDK documentation
import { createIdGenerator } from 'ai';
// @ts-ignore - appendClientMessage is in the Vercel AI SDK documentation
import { appendClientMessage } from 'ai';
// @ts-ignore - appendResponseMessages is in the Vercel AI SDK documentation
import { appendResponseMessages } from 'ai';

// Prompt Builder import
import { buildSystemPrompt } from '../lib/promptBuilder.js';

// Import error handler
import { handleToolError } from '../lib/utils/errorHandlers.js'; // Import the modified handler
import {
  createCreateWebhookTool,
  createSearchWebhooksTool,
  createLinkUserToWebhookTool,
  createLinkAgentToWebhookTool 
} from '../lib/utility/webhook/index.js';

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
    let platformApiKey: string | undefined; // Renamed from apiKey

    try {
      // --- Extraction & Validation --- 
      ({ message: currentMessage, conversationId: conversationId } = req.body);
      // Extract from augmented request object
      clientUserId = req.clientUserId; 
      platformUserId = req.platformUserId;
      platformApiKey = req.headers['x-platform-api-key'] as string;

      if (!clientUserId) {
        // Use the extracted clientUserId for checks
        console.error('[Agent Service /run] Missing x-client-user-id header.');
        res.status(401).json({ success: false, error: 'User authentication required (Missing x-client-user-id)' });
        return;
      }
      if (!platformUserId) {
        // Check for platformUserId from augmented request
        console.error('[Agent Service /run] Missing x-platform-user-id header.');
        res.status(401).json({ success: false, error: 'Platform user context required (Missing x-platform-user-id)' });
        return;
      }
      if (!platformApiKey) {
        // Check for the platformApiKey variable
        console.error('[Agent Service /run] Missing x-platform-api-key header.');
        res.status(401).json({ success: false, error: 'API Key required (Missing x-platform-api-key header)' });
        return;
      }
      if (!currentMessage || !conversationId) {
        console.error('[Agent Service /run] Missing required fields: message, conversationId');
        res.status(400).json({ success: false, error: 'Missing required fields: message, conversationId' });
        return;
      }
      // --- End Extraction & Validation ---
      
      // --- Get Agent Details --- 
      const agentResponse : ServiceResponse<Agent> = await getAgentFromConversation(
        { conversationId: conversationId }, // Pass params object
        clientUserId, // Pass clientUserId for header
        platformUserId, // Pass platformUserId for header
        platformApiKey // Pass platformApiKey for header
      );
      if (!agentResponse.success) {
          console.error(`[Agent Service /run] Failed to get agent for conversation ${conversationId}:`, agentResponse.error);
          // Decide appropriate error response - potentially 404 or 500
          res.status(500).json({ success: false, error: `Failed to load agent configuration: ${agentResponse.error}` });
          return;
      }
      const agent: Agent = agentResponse.data; // Assign agent data
      // --- End Get Agent Details ---

      // --- Initialize Tools (Requires Agent to be fetched first) ---
      const agentServiceCredentials: AgentServiceCredentials = {
        clientUserId: clientUserId, // Pass clientUserId here 
        platformApiKey: platformApiKey, // Pass platformApiKey here
        platformUserId: platformUserId, // Pass platformUserId here
        agentId: agent.id
      };
      const tools = {
        // core tools
        utility_list_utilities: createListUtilitiesTool(agentServiceCredentials, conversationId),
        utility_get_utility_info: createGetUtilityInfoTool(agentServiceCredentials, conversationId),
        utility_call_utility: createCallUtilityTool(agentServiceCredentials, conversationId),
        // webhook tools
        webhook_create_webhook: createCreateWebhookTool(agentServiceCredentials, conversationId),
        webhook_search_webhooks: createSearchWebhooksTool(agentServiceCredentials, conversationId),
        webhook_link_user: createLinkUserToWebhookTool(agentServiceCredentials, conversationId),
        webhook_link_agent: createLinkAgentToWebhookTool(agentServiceCredentials, conversationId)
      };
      // --- End Initialize Tools ---
      

      // --- Get Conversation & History --- 
      let historyMessages: Message[] = [];
      // Use API Client function - getConversation
      const conversationResponse = await getConversationInternalApiService( // Changed function name
        { conversationId }, // Pass params object with conversationId
        platformUserId, // Pass platformUserId for header (assuming order based on getConversation signature)
        platformApiKey, // Pass platformApiKey for header
        clientUserId    // Pass clientUserId for header
      ); 
      // Now check the success field of the ServiceResponse
      if (conversationResponse.success && conversationResponse.data?.messages) {
          historyMessages = conversationResponse.data.messages;
      } else {
          // Log warning if fetching failed or conversation has no messages
          console.warn(`[Agent Service /run] Conversation ${conversationId} not found, error fetching, or no messages present. Starting with empty history. Error: ${conversationResponse.error}`);
      }
      // --- End Get History --- 

      // --- Combine Messages --- 
      const allMessages: Message[] = appendClientMessage({ 
        messages: historyMessages, 
        message: currentMessage 
      });
      // --- End Combine Messages --- 

      // --- Construct System Prompt --- 
      const systemPrompt = buildSystemPrompt(agent); // Pass the whole agent object
      // --- End Construct System Prompt --- 

      // --- Call AI Model --- 
      const result = await streamText({
        model: anthropic(agent.modelId),
        messages: allMessages as any[],
        // @ts-ignore - system is supported by Vercel AI SDK but might not be in inferred type
        system: systemPrompt, // Use the dynamic prompt
        tools: tools,
        maxSteps: 25, 
        providerOptions: { temperature: 0.1, sendReasoning: true },
           // id format for server-side messages:
        experimental_generateMessageId: createIdGenerator({
            prefix: 'msgs',
            size: 16,
        }),
        async onFinish({ response }) { // Destructure response directly
            try {
                // Construct the final list including the latest assistant/tool responses
                const finalMessages: Message[] = appendResponseMessages({
                  messages: allMessages, 
                  responseMessages: response.messages
                });
                
                // Save the complete, updated message list back to the database service
                // Use API Client function - updateConversation
                const saveResult = await updateConversationInternalApiService( // Changed function name
                  { conversationId: conversationId, messages: finalMessages }, // Pass data object with camelCase conversationId
                  platformUserId, // Pass platformUserId for header
                  platformApiKey, // Pass platformApiKey for header
                  clientUserId    // Pass clientUserId for header
                );
                
                if (!saveResult.success) {
                    // Log the error returned from the service function
                    console.error("[Agent Service /run] Error saving messages to DB in onFinish:", saveResult.error);
                }
                
            } catch (dbError) {
              console.error("[Agent Service /run] Exception calling database service to save messages in onFinish:", dbError);
            }
        },
      });
      // --- End Call AI Model ---
      // consume the stream to ensure it runs to completion & triggers onFinish
      // even when the client response is aborted:
      result.consumeStream(); // no await
      // --- Pipe Stream --- 
      // @ts-ignore - Assuming pipeDataStreamToResponse exists
      await result.pipeDataStreamToResponse(res, {
        getErrorMessage: handleToolError // Use the imported handler directly
      });
      // --- End Pipe Stream ---

    } catch (error) {
       console.error("[Agent Service /run] Unhandled error in handleAgentRun:", error); // Log the top-level error
       next(error); // Pass errors to Express error handler
    }
  };

  handleAgentRun().catch(next); // Catch unhandled promise rejections
});

export default runRouter; // Export the new router 