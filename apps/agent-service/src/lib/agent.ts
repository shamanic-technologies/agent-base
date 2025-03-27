/**
 * Claude 3.7 Sonnet Agent Implementation with Vercel AI SDK
 * 
 * Clean implementation using Vercel AI SDK with Claude 3.7 Sonnet.
 * Provides streaming text generation with tools integration.
 */

import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
import axios from 'axios';

// Import tool creators - each in its own file for better organization
import { createListUtilitiesTool } from './utility/utility_list_utilities.js';
import { createGetUtilityInfoTool } from './utility/utility_get_utility_info.js';
import { createCallUtilityTool } from './utility/utility_call_utility.js';

// Default model to use
const MODEL_NAME = 'claude-3-7-sonnet-20250219';

/**
 * Create a Claude agent with utility tools
 * 
 * Creates an AI agent with Claude 3.7 Sonnet and utility tools for extended capabilities.
 * Following the Vercel AI SDK documentation pattern.
 */
export async function createAgent({ 
  userId, 
  conversationId, 
  apiKey, 
  modelName = MODEL_NAME 
}: {
  userId: string;
  conversationId: string;
  apiKey: string;
  modelName?: string;
}) {
  console.log(`Creating agent with model: ${modelName}, userId: ${userId}, conversationId: ${conversationId}`);

  // Tool credentials for all tools
  const credentials = {
    userId,
    conversationId,
    apiKey
  };

  // Initialize tools using tool creators
  const tools = {
    utility_list_utilities: createListUtilitiesTool(credentials),
    utility_get_utility_info: createGetUtilityInfoTool(credentials),
    utility_call_utility: createCallUtilityTool(credentials)
  };

  /**
   * Process a conversation with the agent
   */
  const processWithAgent = async (messages: any[]) => {
    try {
      console.log(`Processing with agent for user: ${userId}, conversation: ${conversationId}`);
      
      // Stream text from the model with tools
      return await streamText({
        model: anthropic(modelName),
        messages,
        tools,
        // @ts-ignore - maxSteps property is supported by Vercel AI SDK
        maxSteps: 5, // Allow multi-step tool usage
        providerOptions: {
          temperature: 0.1,
          maxTokens: 12000,
          sendReasoning: true, // Ensure reasoning is sent in the response
        },
      });
    } catch (error) {
      console.error('Error with agent:', error);
      throw error;
    }
  };

  return { processWithAgent };
}
