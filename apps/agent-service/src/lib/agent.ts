/**
 * Claude 3.7 Sonnet Agent Implementation with Vercel AI SDK
 * 
 * Clean, production-ready implementation using Vercel AI SDK with Claude 3.7 Sonnet.
 * Provides robust streaming text generation with enhanced reasoning capabilities.
 * Tools temporarily disabled for UI compatibility.
 */

// Type imports for Vercel AI SDK
import { anthropic } from '@ai-sdk/anthropic';
import { StreamResult, streamText } from 'ai';
import { ModelName, NodeType } from "../types/agent-config.js";
// Tools imports temporarily commented out for compatibility
// import { 
//   UtilityListUtilities, 
//   UtilityGetUtilityInfo, 
//   UtilityCallUtility 
// } from './utility/index.js';

/**
 * Stream AI responses using Claude 3.7 Sonnet
 * 
 * This function creates a streaming text generation response using Claude 3.7 Sonnet.
 * It returns a StreamResult that can be converted to a standard data stream for HTTP responses.
 * 
 * @param message - User message to process
 * @param userId - User ID for tracking and analytics
 * @param conversationId - Unique identifier for the conversation
 * @param apiKey - API key for tool usage
 * @returns StreamResult object compatible with Vercel AI SDK
 */
export function streamWithAgent(
  message: string,
  userId: string,
  conversationId: string,
  apiKey: string
): StreamResult {
  try {
    console.log(`[Agent Service] Processing request with Claude 3.7 Sonnet: "${message.substring(0, 100)}..."`)
    
    // Use the streamText implementation from Vercel AI SDK
    return streamText({
      model: anthropic(ModelName.CLAUDE_3_7_SONNET_20250219),
      messages: [{ role: 'user', content: message }],
      // Tools temporarily disabled for UI compatibility
      providerOptions: {
        anthropic: {
          // Enhanced thinking capabilities for better reasoning
          thinking: { 
            type: 'enabled', 
            budgetTokens: 12000 
          },
        },
      },
    });
  } catch (error) {
    console.error('[Agent Service] Error in AI text generation:', error);
    throw error;
  }
}

// Tools initialization temporarily commented out for UI compatibility
/*
function initializeTools(userId: string, conversationId: string, apiKey: string) {
  // Common parameters for all tools
  const toolParams = {
    conversationId,
    parentNodeId: 'agent' as string,
    parentNodeType: NodeType.AGENT,
    userId,
    apiKey
  };
  
  // Initialize each utility tool
  const listUtilities = new UtilityListUtilities(toolParams);
  const getUtilityInfo = new UtilityGetUtilityInfo(toolParams);
  const callUtility = new UtilityCallUtility(toolParams);
  
  return [
    listUtilities,
    getUtilityInfo,
    callUtility
  ];
}
*/ 