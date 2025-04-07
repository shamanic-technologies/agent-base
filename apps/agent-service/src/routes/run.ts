/**
 * Agent Run Route
 * 
 * Handles the core agent interaction logic via POST /run.
 */
import { Router, Request, Response, NextFunction } from 'express';
import {
    // Import all types needed specifically for the /run endpoint
    AgentRecord, 
} from '@agent-base/agents';
// AI SDK imports
import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
// @ts-ignore - Message not directly exported from 'ai' in this context
import { Message } from 'ai';

// Service function imports
import { 
  getAgentFromConversation, 
  getConversationById,
  updateConversationMessagesInDb
} from '../services/database.js';

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

const runRouter = Router(); // Use a specific router for this file

/**
 * Run agent interaction endpoint
 */
runRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const handleAgentRun = async () => {
    let agent: AgentRecord; 
    let currentMessage: Message;
    let conversation_id: string;
    let userId: string;

    try {
      // --- Extraction & Validation --- 
      ({ message: currentMessage, conversation_id } = req.body);
      userId = (req as any).user?.id as string;
      const apiKey = req.headers['x-api-key'] as string;

      if (!userId) {
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
      
      // --- Initialize Tools ---
      const toolCredentials = { userId, conversationId: conversation_id, apiKey };
      const tools = {
          utility_list_utilities: createListUtilitiesTool(toolCredentials),
          utility_get_utility_info: createGetUtilityInfoTool(toolCredentials),
          utility_call_utility: createCallUtilityTool(toolCredentials)
      };
      // --- End Initialize Tools ---
      
      // --- Get Agent Details --- 

      agent = await getAgentFromConversation(conversation_id, userId);
      console.log(`[Agent Service /run] Fetched agent details for conversation: ${conversation_id}, using model: ${agent.agent_model_id}`);
      // --- End Get Agent Details ---

      // --- Get Conversation & History --- 
      let historyMessages: Message[] = [];
      try {
          const conversationResponse = await getConversationById(conversation_id, userId);
          if (conversationResponse.success && conversationResponse.data) {
              historyMessages = conversationResponse.data.messages || [];
              console.log(`[Agent Service /run] Fetched ${historyMessages.length} history messages for conv: ${conversation_id}`);
          } else {
              console.warn(`[Agent Service /run] Conversation ${conversation_id} not found or error fetching, starting with empty history.`);
              // Proceed with empty history if conversation isn't found (e.g., first message)
          }
      } catch (fetchError) {
          console.error(`[Agent Service /run] Error fetching conversation ${conversation_id}, proceeding with empty history:`, fetchError);
          // Proceed with empty history on error
      }
      // --- Combine Messages --- 
      const allMessages: Message[] = appendClientMessage({ 
        messages: historyMessages, 
        message: currentMessage 
      });
      // --- End Combine Messages --- 

      // --- Call AI Model --- 
      const result = await streamText({
        model: anthropic(agent.agent_model_id),
        messages: allMessages as any[],
        tools: tools,
        // @ts-ignore - maxSteps is a valid property
        maxSteps: 25, 
        providerOptions: { temperature: 0.1, sendReasoning: true },
           // id format for server-side messages:
        experimental_generateMessageId: createIdGenerator({
            prefix: 'msgs',
            size: 16,
        }),
        async onFinish({ text, toolCalls, response }) { 
            console.log(`[Agent Service /run] Stream finished via onFinish... Saving messages...`);
            try {
                console.log(`[Agent Service /run] onFinish... Appending response messages...`);
                // Construct the final list including the latest assistant/tool responses
                const finalMessages: Message[] = appendResponseMessages({
                  messages: allMessages, 
                  responseMessages: response.messages
                });
                console.log(`[Agent Service /run] finalMessages to save:`, JSON.stringify(finalMessages, null, 2));
                
                // Save the complete, updated message list back to the database service
                const saveResult = await updateConversationMessagesInDb(conversation_id, finalMessages, userId);
                
                if (!saveResult.success) {
                    console.error("[Agent Service /run] Error saving messages to DB in onFinish:", saveResult.error);
                } else {
                    console.log("[Agent Service /run] Messages saved successfully via onFinish.");
                }
                
            } catch (dbError) {
              console.error("[Agent Service /run] Error calling database service to save messages in onFinish:", dbError);
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
        getErrorMessage: (error: Error) => {
          console.error("[Agent Service /run] Error during stream piping:", error);
          return "An error occurred while processing the AI response.";
        }
      });
      // --- End Pipe Stream ---

    } catch (error) {
       next(error); // Pass errors to Express error handler
    }
  };

  handleAgentRun().catch(next); // Catch unhandled promise rejections
});

export default runRouter; // Export the new router 