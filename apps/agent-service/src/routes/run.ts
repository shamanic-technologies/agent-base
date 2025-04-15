/**
 * Agent Run Route
 * 
 * Handles the core agent interaction logic via POST /run.
 */
import { Router, Request, Response, NextFunction } from 'express';
import {
    AgentRecord, 
    ClientUser,
    PlatformUser
} from '@agent-base/types';
// AI SDK imports
import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
// @ts-ignore - Message not directly exported from 'ai' in this context
import { Message } from 'ai';
// Import User type
import { UtilityToolCredentials } from '../types/index.js';

// Service function imports
import { 
  getAgentFromConversation, 
  getConversationById,
  updateConversationMessagesInDb,
  getUserById
} from '../services/index.js'; // Updated path to barrel file

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

const runRouter = Router(); // Use a specific router for this file

/**
 * Run agent interaction endpoint
 */
runRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const handleAgentRun = async () => {
    let agent: AgentRecord | null = null; // Initialize as null
    let clientUser: ClientUser | null = null; // Initialize as null
    let currentMessage: Message;
    let conversation_id: string;
    let platformUser: PlatformUser;

    try {
      // --- Extraction & Validation --- 
      ({ message: currentMessage, conversation_id } = req.body);
      platformUser = (req as any).user?.id as string;
      const apiKey = req.headers['x-api-key'] as string;

      if (!platformUser) {
        res.status(401).json({ success: false, error: 'User authentication required (Missing x-user-id)' });
        return;
      }
      if (!apiKey) {
        res.status(401).json({ success: false, error: 'API Key required (Missing x-api-key header)' });
        return;
      }
      if (!currentMessage || !conversation_id) {
        res.status(400).json({ success: false, error: 'Missing required fields: message, conversation_id' });
        return;
      }
      // --- End Extraction & Validation ---
      
      // --- Get Agent Details --- 
      const agentResponse = await getAgentFromConversation(conversation_id, platformUser);
      if (!agentResponse.success || !agentResponse.data) {
          console.error(`[Agent Service /run] Failed to get agent for conversation ${conversation_id}:`, agentResponse.error);
          // Decide appropriate error response - potentially 404 or 500
          res.status(500).json({ success: false, error: `Failed to load agent configuration: ${agentResponse.error}` });
          return;
      }
      agent = agentResponse.data; // Assign agent data
      console.log(`[Agent Service /run] Fetched agent details for conversation: ${conversation_id}, using model: ${agent.agent_model_id}`);
      // --- End Get Agent Details ---

      // --- Initialize Tools (Requires Agent to be fetched first) ---
      const toolCredentials: UtilityToolCredentials = {
        userId: platformUser, 
        conversationId: conversation_id, 
        apiKey, 
        agent_id: agent.agent_id
      };
      const tools = {
          utility_list_utilities: createListUtilitiesTool(toolCredentials),
          utility_get_utility_info: createGetUtilityInfoTool(toolCredentials),
          utility_call_utility: createCallUtilityTool(toolCredentials)
      };
      // --- End Initialize Tools ---
      
      // --- Get User Profile --- 
      const profileResponse= await getUserById(platformUser); // Call the service
      if (profileResponse.success && profileResponse.data) {
          clientUser = mapUserFromDatabase(profileResponse.data);
          console.log(`[Agent Service /run] Fetched user profile for user: ${platformUser}`);
          console.log(`[Agent Service /run] User profile: ${JSON.stringify(clientUser)}`);
      } else {
          // Log warning but continue - profile is optional context
          console.warn(`[Agent Service /run] Could not fetch profile for user ${platformUser}:`, profileResponse.error);
      }
      // --- End Get User Profile --- 

      // --- Get Conversation & History --- 
      let historyMessages: Message[] = [];
      const conversationResponse = await getConversationById(conversation_id, platformUser);
      // Now check the success field of the ServiceResponse
      if (conversationResponse.success && conversationResponse.data?.messages) {
          historyMessages = conversationResponse.data.messages;
          console.log(`[Agent Service /run] Fetched ${historyMessages.length} history messages for conv: ${conversation_id}`);
      } else {
          // Log warning if fetching failed or conversation has no messages
          console.warn(`[Agent Service /run] Conversation ${conversation_id} not found, error fetching, or no messages present. Starting with empty history. Error: ${conversationResponse.error}`);
      }
      // --- End Get History --- 

      // --- Combine Messages --- 
      const allMessages: Message[] = appendClientMessage({ 
        messages: historyMessages, 
        message: currentMessage 
      });
      // --- End Combine Messages --- 

      // --- Construct System Prompt --- 
      const systemPrompt = buildSystemPrompt(agent, clientUser); // Pass the whole agent object
      console.log(`[Agent Service /run] Constructed System Prompt length: ${systemPrompt.length}`); // Log length for debugging
      console.log(`[Agent Service /run] System Prompt: ${systemPrompt}`); // Log the prompt for debugging
      // --- End Construct System Prompt --- 

      // --- Call AI Model --- 
      const result = await streamText({
        model: anthropic(agent.agent_model_id),
        messages: allMessages as any[],
        // @ts-ignore - system is supported by Vercel AI SDK but might not be in inferred type
        system: systemPrompt, // Use the dynamic prompt
        tools: tools,
        // @ts-ignore - maxSteps is a valid property
        maxSteps: 25, 
        providerOptions: { temperature: 0.1, sendReasoning: true },
           // id format for server-side messages:
        experimental_generateMessageId: createIdGenerator({
            prefix: 'msgs',
            size: 16,
        }),
        async onFinish({ response }) { // Destructure response directly
            console.log(`[Agent Service /run] Stream finished via onFinish... Saving messages...`);
            try {
                console.log(`[Agent Service /run] onFinish... Appending response messages...`);
                // Construct the final list including the latest assistant/tool responses
                const finalMessages: Message[] = appendResponseMessages({
                  messages: allMessages, 
                  responseMessages: response.messages
                });
                console.log(`[Agent Service /run] finalMessages count to save: ${finalMessages.length}`);
                
                // Save the complete, updated message list back to the database service
                // Use the refactored service function
                const saveResult = await updateConversationMessagesInDb(conversation_id, finalMessages, platformUser);
                
                if (!saveResult.success) {
                    // Log the error returned from the service function
                    console.error("[Agent Service /run] Error saving messages to DB in onFinish:", saveResult.error);
                } else {
                    console.log("[Agent Service /run] Messages saved successfully via onFinish.");
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