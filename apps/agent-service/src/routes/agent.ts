/**
 * Agent routes
 * 
 * Endpoints for agent management - creates, lists, and updates agents via database service
 * Also includes the main /run endpoint for agent interaction.
 */
import { Router, RequestHandler } from 'express';
import type { Request, Response } from 'express';
import axios from 'axios';
import {
  CreateAgentInput,
  UpdateAgentInput,
  ListUserAgentsInput,
  CreateAgentResponse,
  UpdateAgentResponse,
  ListUserAgentsResponse,
  Agent,
  // Use MessageRecord for DB interaction types
  MessageRecord, 
  SaveMessageInput,
  GetMessagesResponse,
  AgentRecord // Import AgentRecord for agent details type
} from '@agent-base/agents';
// Correct AI SDK imports
import { anthropic } from '@ai-sdk/anthropic';
// Import only streamText
import { streamText } from 'ai'; 

// Import database service functions
import { 
  getAgentDetails, 
  getConversationHistory, 
  saveMessage 
} from '../services/database.js';

// --- Add Tool Creator Imports ---
import { createListUtilitiesTool } from '../lib/utility/utility_list_utilities.js';
import { createGetUtilityInfoTool } from '../lib/utility/utility_get_utility_info.js';
import { createCallUtilityTool } from '../lib/utility/utility_call_utility.js';
// -------------------------------

// Define the Message type explicitly based on common AI SDK structure
interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
}

const router = Router();
const DATABASE_SERVICE_URL = process.env.DATABASE_SERVICE_URL || 'http://localhost:3006';

// Removed direct Anthropic client initialization here
// const anthropicClient = createAnthropic({...}); 

/**
 * Create a new agent endpoint
 * Accepts agent details and forwards request to database service
 */
router.post('/create', async (req: Request, res: Response) => {
  try {
    const input: CreateAgentInput = req.body;
    
    // Extract user ID from auth middleware
    const userId = (req as any).user?.id as string;

    // Validate required fields
    if (!input.agent_first_name || !input.agent_last_name || !input.agent_profile_picture || 
        !input.agent_gender || !input.agent_system_prompt || !input.agent_model_id || 
        !input.agent_memory || !input.agent_job_title) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
      return;
    }

    // Call database service to create agent
    const response = await axios.post<CreateAgentResponse>(
      `${DATABASE_SERVICE_URL}/agents/create`,
      input
    );

    // If agent created successfully, link it to the user
    if (response.data.success && response.data.data && userId) {
      const agentIdToLink = response.data.data.agent_id;
      console.log(`[Agent Service /create] Agent ${agentIdToLink} created. Attempting to link to user ${userId}...`); // Log attempt
      try {
        // Link agent to user
        const linkResponse = await axios.post(`${DATABASE_SERVICE_URL}/agents/link`, {
          user_id: userId,
          agent_id: agentIdToLink
        });
        // Log success or failure of linking
        if (linkResponse.data?.success) {
          console.log(`[Agent Service /create] Successfully linked agent ${agentIdToLink} to user ${userId}.`);
        } else {
          console.warn(`[Agent Service /create] Linking agent ${agentIdToLink} to user ${userId} failed (API returned success: false). Response:`, linkResponse.data);
        }
      } catch (linkError) {
        console.error(`[Agent Service /create] Error calling /agents/link for agent ${agentIdToLink}, user ${userId}:`, linkError);
        // Decide if this error should prevent sending the original success response
        // For now, we still send the original agent creation response
      }
    }

    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('[Agent Service] Error creating agent:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * Update an existing agent endpoint
 * Accepts agent updates and forwards request to database service
 */
router.post('/update', async (req: Request, res: Response) => {
  try {
    const input: UpdateAgentInput = req.body;
    
    // Validate agent_id is provided
    if (!input.agent_id) {
      res.status(400).json({
        success: false,
        error: 'agent_id is required'
      });
      return;
    }

    // Call database service to update agent
    const response = await axios.post<UpdateAgentResponse>(
      `${DATABASE_SERVICE_URL}/agents/update`,
      input
    );

    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('[Agent Service] Error updating agent:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * List agents for a user endpoint
 * Gets all agents associated with the authenticated user
 */
router.get('/list', async (req: Request, res: Response) => {
  try {
    // Extract user ID from auth middleware
    const userId = (req as any).user?.id as string;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
      return;
    }

    // Call database service to list agents for user
    const response = await axios.get<ListUserAgentsResponse>(
      `${DATABASE_SERVICE_URL}/agents/list`, {
        params: { user_id: userId }
      }
    );

    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('[Agent Service] Error listing agents:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * Run agent interaction endpoint
 */
// Make the main handler non-async
router.post('/run', (req: Request, res: Response) => {
  // Define an async helper function to contain the core logic
  const handleAgentRun = async () => {
    let agent: AgentRecord; // Define agent here to access in persistence step
    let messages: Message[]; // Define messages here
    let conversation_id: string; // Define conversation_id here
    let userId: string; // Define userId here
    let agent_id: string; // Define agent_id here

    try {
      // Extract data from request body and user context
      ({ agent_id, messages, conversation_id } = req.body);
      userId = (req as any).user?.id as string;
      // ---> Get API Key from header <---
      const apiKey = req.headers['x-api-key'] as string;

      // Validation
      if (!userId) {
        res.status(401).json({ success: false, error: 'User authentication required (Missing x-user-id)' });
        return;
      }
      // ---> Add validation for API Key <---
      if (!apiKey) {
        res.status(401).json({ success: false, error: 'API Key required (Missing x-api-key header)' });
        return;
      }
      if (!agent_id || !messages || messages.length === 0 || !conversation_id) {
        res.status(400).json({ success: false, error: 'Missing required fields: agent_id, messages array, conversation_id' });
        return;
      }

      // --- Initialize Tools ---
      // Pass the apiKey read from the header
      const toolCredentials = {
          userId,
          conversationId: conversation_id, 
          apiKey // Use the key from the header
      };
      const tools = {
          utility_list_utilities: createListUtilitiesTool(toolCredentials),
          utility_get_utility_info: createGetUtilityInfoTool(toolCredentials),
          utility_call_utility: createCallUtilityTool(toolCredentials)
      };
      // ----------------------
      
      // 1. Get Agent Details using the service function
      try {
        agent = await getAgentDetails(userId, agent_id);
        console.log(`[Agent Service /run] Fetched agent details for: ${agent_id}, using model: ${agent.agent_model_id}`);
      } catch (error) {
        console.error(`[Agent Service /run] Failed to fetch agent details:`, error);
        const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
        res.status(statusCode).json({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch agent details' });
        return;
      }

      // 2. Get Conversation History using the service function
      let historyMessages: Message[] = [];
      try {
        const historyRecords = await getConversationHistory(userId, conversation_id);
        // Map history from MessageRecord to Message format
        historyMessages = historyRecords.map(msg => ({
             role: msg.role,
             content: msg.content || '' // Handle null/undefined content 
         }));
        console.log(`[Agent Service /run] Fetched ${historyMessages.length} history messages for conv: ${conversation_id}`);
      } catch (error) {
        // Log error but continue, as history might not be critical
        console.warn(`[Agent Service /run] Failed to fetch history for conv ${conversation_id}:`, error);
      }

      // 3. Combine messages for AI
      const allMessages: Message[] = [
        { role: 'system', content: agent.agent_system_prompt },
        ...historyMessages,
        ...messages
      ];

      // 4. Call AI model and stream response, handle persistence in onFinish
      const result = await streamText({
        model: anthropic(agent.agent_model_id), 
        messages: allMessages as any[], // Cast to any[] 
        tools: tools,
        // @ts-ignore - maxSteps property is supported by Vercel AI SDK
        maxSteps: 25, // Allow multi-step tool usage
        providerOptions: { // <-- Add providerOptions if needed (like in lib/agent.ts)
            temperature: 0.1, // Example value
            sendReasoning: true, // Example value - Check if needed here
        },
        // @ts-ignore - Suppress potential property not found error for onFinish
        async onFinish({ text, toolCalls, toolResults, finishReason, usage, response }) { // Add 'response' if needed for structured messages
            console.log(`[Agent Service /run] Stream finished via onFinish (Reason: ${finishReason}). Saving messages...`);
            try {
              // a. Save user message
              const userMessage = messages[messages.length - 1];
              if (userMessage && userMessage.role === 'user') {
                const userSaveInput: SaveMessageInput = {
                  conversation_id,
                  user_id: userId,
                  agent_id,
                  role: 'user',
                  content: userMessage.content, // Assumes string content
                };
                await saveMessage(userSaveInput);
              }

              // b. Save assistant message (using text from onFinish)
              const assistantSaveInput: SaveMessageInput = {
                  conversation_id,
                  user_id: userId,
                  agent_id,
                  role: 'assistant',
                  content: text, // Use text from onFinish result
                  tool_calls: toolCalls, // Pass tool calls if any
              };
              await saveMessage(assistantSaveInput);
              
              // TODO: Handle saving tool_results if needed
              
              console.log("[Agent Service /run] Messages saved successfully via onFinish.");

            } catch (dbError) {
              console.error("[Agent Service /run] Error saving messages to DB in onFinish:", dbError);
            }
        },
      });

      // 5. Pipe the stream directly to the response using the pattern from stream.ts
      // This still works even with onFinish defined
      // @ts-ignore - Assuming result has pipeDataStreamToResponse based on stream.ts
      await result.pipeDataStreamToResponse(res, {
        getErrorMessage: (error: Error) => {
          console.error("[Agent Service /run] Error during stream piping:", error);
          return "An error occurred while processing the AI response.";
        }
      });
      
      // No need for await result.text here as persistence is in onFinish

    } catch (error) {
      console.error('[Agent Service] Error in /run endpoint async helper:', error);
      if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown internal server error'
          });
      }
    }
  };

  // Call the async helper
  handleAgentRun().catch(err => {
    console.error('[Agent Service] Unhandled rejection in handleAgentRun:', err);
    // Ensure a response is sent if headers aren't already sent
    if (!res.headersSent) {
        res.status(500).json({
            success: false,
            error: 'Unhandled server error during agent run'
        });
    }
  });
});

export default router; 