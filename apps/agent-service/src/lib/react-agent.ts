/**
 * Claude 3.7 Sonnet Agent Implementation with Vercel AI SDK
 * 
 * 100% streaming-only implementation with Claude 3.7 Sonnet.
 * Leverages extended thinking capabilities for enhanced reasoning
 * through real-time streamed responses.
 */

// Type imports for Vercel AI SDK
import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
import { z } from 'zod';

// Import utilities
import { UtilityListUtilities, UtilityGetUtilityInfo, UtilityCallUtility } from "./utility/index.js";
import { ModelName, NodeType } from "../types/agent-config.js";

/**
 * Creates Vercel AI SDK compatible tools using proper Zod schemas
 */
function createTools(config: { 
  conversationId: string;
  userId: string;
  apiKey: string;
}) {
  const { conversationId, userId, apiKey } = config;
  
  // Initialize utility instances
  const listUtilities = new UtilityListUtilities({
    conversationId,
    parentNodeId: 'agent',
    parentNodeType: NodeType.AGENT,
    userId,
    apiKey
  });
  
  const getUtilityInfo = new UtilityGetUtilityInfo({
    conversationId,
    parentNodeId: 'agent',
    parentNodeType: NodeType.AGENT,
    userId,
    apiKey
  });
  
  const callUtility = new UtilityCallUtility({
    conversationId,
    parentNodeId: 'agent',
    parentNodeType: NodeType.AGENT,
    userId,
    apiKey
  });
  
  // Define tools with proper Zod schemas
  return {
    listUtilities: {
      description: listUtilities.description,
      parameters: z.object({
        input: z.string().optional().describe("Optional input parameters")
      }),
      execute: async ({ input }: { input?: string }) => {
        try {
          return await listUtilities.invoke(input ? JSON.parse(input) : {});
        } catch (error) {
          console.error(`Error executing listUtilities:`, error);
          return { error: `Failed to execute listUtilities: ${error}` };
        }
      }
    },
    getUtilityInfo: {
      description: getUtilityInfo.description,
      parameters: z.object({
        utility_id: z.string().describe("The ID of the utility to get information about")
      }),
      execute: async ({ utility_id }: { utility_id: string }) => {
        try {
          return await getUtilityInfo.invoke({ utility_id });
        } catch (error) {
          console.error(`Error executing getUtilityInfo:`, error);
          return { error: `Failed to execute getUtilityInfo: ${error}` };
        }
      }
    },
    callUtility: {
      description: callUtility.description,
      parameters: z.object({
        utility_id: z.string().describe("The ID of the utility to call (e.g., utility_get_current_datetime)"),
        parameters: z.record(z.any()).describe("Parameters to pass to the utility, based on its requirements")
      }),
      execute: async ({ utility_id, parameters }: { utility_id: string, parameters: Record<string, any> }) => {
        try {
          // Format the input as expected by the UtilityCallUtility class
          const inputObj = { utility_id, parameters };
          const inputStr = JSON.stringify(inputObj);
          
          return await callUtility.invoke(inputStr);
        } catch (error) {
          console.error(`Error executing callUtility:`, error);
          return { error: `Failed to execute callUtility: ${error}` };
        }
      }
    }
  };
}

/**
 * Stream responses from Claude 3.7 Sonnet
 * 
 * @param message - User message to process
 * @param userId - User ID for tracking
 * @param conversationId - Conversation ID for context
 * @param apiKey - API key for tool usage
 * @returns AsyncGenerator yielding JSON-serialized chunks
 */
export async function* streamWithReActAgent(
  message: string,
  userId: string,
  conversationId: string,
  apiKey: string
): AsyncGenerator<string, void, unknown> {
  try {
    // Create tools
    const tools = createTools({
      conversationId,
      userId,
      apiKey
    });
    
    // Create stream using Vercel AI SDK with type assertion to bypass TypeScript checks
    // The maxSteps parameter is documented in the AI SDK but not yet in the TypeScript definitions
    const result = streamText({
      model: anthropic(ModelName.CLAUDE_3_7_SONNET_20250219),
      messages: [{ role: 'user', content: message }],
      temperature: 0,
      tools,
      providerOptions: {
        anthropic: {
          // Increase thinking token budget to allow for more reasoning steps and tool calls
          thinking: { type: 'enabled', budgetTokens: 20000 },
          // Add tool-use configuration to allow for more tool calls
          toolChoice: "auto",
        },
      },
      onError({ error }) {
        console.error('[Agent Service] Stream error:', error);
      },
      // @ts-ignore - maxSteps is supported by the AI SDK but not in the TypeScript definitions
      maxSteps: 25, // Enable multi-step tool usage with up to 25 steps
    });
    
    // Stream responses and reasoning using fullStream for complete type coverage
    for await (const part of result.fullStream) {
      switch (part.type) {
        case 'text-delta':
          yield JSON.stringify({ 
            type: 'text', 
            content: part.textDelta
          });
          break;
        
        case 'tool-call':
          yield JSON.stringify({ 
            type: 'tool_call', 
            name: part.toolName,
            args: part.args
          });
          break;
          
        case 'tool-result':
          yield JSON.stringify({ 
            type: 'tool_result', 
            name: part.toolName,
            result: part.result
          });
          break;
        
        case 'reasoning':
          yield JSON.stringify({ 
            type: 'reasoning', 
            content: part.textDelta || ''
          });
          break;
          
        case 'error':
          yield JSON.stringify({ 
            type: 'error', 
            error: typeof part.error === 'object' && part.error ? 
                  (part.error as Error).message || 'Unknown error' :
                  'Unknown error'
          });
          break;
      }
    }
    
    // Include final text in the stream
    const finalText = await result.text;
    yield JSON.stringify({
      type: 'complete',
      content: finalText,
      conversation_id: conversationId
    });
    
  } catch (error) {
    console.error('[Agent Service] Error in streamWithReActAgent:', error);
    yield JSON.stringify({ 
      type: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
} 