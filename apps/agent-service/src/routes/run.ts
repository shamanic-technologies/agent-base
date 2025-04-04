/**
 * Agent Run Route
 * 
 * Handles the core agent interaction logic via POST /run.
 */
import { Router, Request, Response, NextFunction } from 'express';
import axios from 'axios';
import {
    // Import all types needed specifically for the /run endpoint
    AgentRecord, 
    MessageRecord, 
    CreateMessageInput, // Renamed input type
    GetMessagesInput,   // Needed by getConversationMessages call
    GetMessagesResponse // Needed by getConversationMessages call
} from '@agent-base/agents';
// AI SDK imports
import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai'; 

// Service function imports
import { 
  getConversationAgent, 
  getConversationMessages, 
  createMessage 
} from '../services/database.js';

// Tool Creator Imports
import { createListUtilitiesTool } from '../lib/utility/utility_list_utilities.js';
import { createGetUtilityInfoTool } from '../lib/utility/utility_get_utility_info.js';
import { createCallUtilityTool } from '../lib/utility/utility_call_utility.js';

// Define the Message type (copied from agent.ts)
interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
}

const runRouter = Router(); // Use a specific router for this file

/**
 * Run agent interaction endpoint
 */
runRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const handleAgentRun = async () => {
    let agent: AgentRecord; 
    let messages: Message[]; 
    let conversation_id: string;
    let userId: string;

    try {
      // --- Extraction & Validation --- 
      ({ messages, conversation_id } = req.body);
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
      if (!messages || messages.length === 0 || !conversation_id) {
        res.status(400).json({ success: false, error: 'Missing required fields: messages array, conversation_id' });
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
      try {
        agent = await getConversationAgent(conversation_id, userId);
        console.log(`[Agent Service /run] Fetched agent details for conversation: ${conversation_id}, using model: ${agent.agent_model_id}`);
      } catch (error) {
        console.error(`[Agent Service /run] Failed to fetch agent details:`, error);
        const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
        res.status(statusCode).json({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch agent details' });
        return;
      }
      // --- End Get Agent Details ---

      // --- Get Conversation Messages ---
      let historyMessages: Message[] = [];
      try {
        const historyRecords = await getConversationMessages(conversation_id);
        historyMessages = historyRecords.map(msg => ({ 
             role: msg.role,
             content: msg.content || '' 
         }));
        console.log(`[Agent Service /run] Fetched ${historyMessages.length} messages for conv: ${conversation_id}`);
      } catch (error) {
        console.warn(`[Agent Service /run] Failed to fetch messages for conv ${conversation_id}:`, error);
      }
      // --- End Get Conversation Messages ---

      // --- Combine Messages --- 
      const allMessages: Message[] = [
        { role: 'system', content: agent.agent_system_prompt },
        ...historyMessages,
        ...messages
      ];
      // --- End Combine Messages ---

      // --- Call AI Model --- 
      const result = await streamText({
        model: anthropic(agent.agent_model_id), 
        messages: allMessages as any[],
        tools: tools,
        // @ts-ignore - maxSteps is a valid property
        maxSteps: 25, 
        providerOptions: { temperature: 0.1, sendReasoning: true },
        async onFinish({ text, toolCalls }) { 
            console.log(`[Agent Service /run] Stream finished via onFinish... Saving messages...`);
            try {
              const userMessage = messages[messages.length - 1];
              if (userMessage && userMessage.role === 'user') {
                const userSaveInput: CreateMessageInput = { conversation_id, role: 'user', content: userMessage.content };
                await createMessage(userSaveInput);
              }
              const assistantSaveInput: CreateMessageInput = { conversation_id, role: 'assistant', content: text, tool_calls: toolCalls };
              await createMessage(assistantSaveInput);
              console.log("[Agent Service /run] Messages saved successfully via onFinish.");
            } catch (dbError) {
              console.error("[Agent Service /run] Error saving messages to DB in onFinish:", dbError);
            }
        },
      });
      // --- End Call AI Model ---

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