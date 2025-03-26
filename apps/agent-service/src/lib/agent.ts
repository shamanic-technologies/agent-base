/**
 * Claude 3.7 Sonnet Agent Implementation with Vercel AI SDK
 * 
 * Clean, production-ready implementation using Vercel AI SDK with Claude 3.7 Sonnet.
 * Provides robust streaming text generation with enhanced reasoning capabilities.
 * Includes proper Vercel AI SDK tool integration.
 */

// Type imports for Vercel AI SDK
import { anthropic } from '@ai-sdk/anthropic';
import { StreamResult, streamText } from 'ai';
import { z } from 'zod';
import axios from 'axios';
import { ModelName, NodeType } from "../types/agent-config.js";

// API Gateway URL from environment variables with fallback
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:3002';

/**
 * Stream AI responses using Claude 3.7 Sonnet with tools
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
    
    // Define tools using inline objects for compatibility with ai SDK 4.2.5
    const tools = {
      // List all available utilities
      utility_list_utilities: {
        description: 'Get a list of all available utility functions.',
        parameters: z.object({}),
        execute: async () => {
          try {
            // Call the API Gateway endpoint
            const response = await axios.get(`${API_GATEWAY_URL}/utility-tool/get-list`, {
              params: {
                user_id: userId,
                conversation_id: conversationId
              },
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey
              }
            });
            
            if (response.data && response.data.utilities) {
              const utilities = response.data.utilities;
              
              if (utilities.length === 0) {
                return 'No utilities are currently available.';
              }
              
              // Extract the ID of each utility object
              const utilityIds = utilities.map((utility: any) => utility.id);
              return `Available utilities: ${utilityIds.join(', ')}`;
            }
            
            return 'Error: Invalid response from API Gateway';
          } catch (error) {
            console.error("Error listing utilities:", error);
            
            if (axios.isAxiosError(error)) {
              // Handle network errors or API errors
              if (!error.response) {
                return `Network error: Failed to connect to API Gateway at ${API_GATEWAY_URL}`;
              }
              
              return `API Gateway error: ${error.response.status} - ${error.response.data?.error || error.message}`;
            }
            
            // Generic error
            return `Error while listing utilities: ${error instanceof Error ? error.message : String(error)}`;
          }
        }
      },
      
      // Get info about a specific utility
      utility_get_utility_info: {
        description: 'Get detailed information about a specific utility.',
        parameters: z.object({
          utility_id: z.string().describe('The ID of the utility to get information about')
        }),
        execute: async ({ utility_id }) => {
          try {
            // Validate input
            if (!utility_id) {
              return 'Error: utility_id is required';
            }
            
            // Call the API Gateway endpoint
            const response = await axios.get(`${API_GATEWAY_URL}/utility-tool/get-details/${utility_id}`, {
              params: {
                user_id: userId,
                conversation_id: conversationId
              },
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey
              }
            });
            
            if (response.data) {
              // Return raw JSON data as a string
              return JSON.stringify(response.data, null, 2);
            }
            
            return 'Error: Invalid response from API Gateway';
          } catch (error) {
            console.error(`Error getting info for utility ${utility_id}:`, error);
            
            if (axios.isAxiosError(error)) {
              // Handle network errors or API errors
              if (!error.response) {
                return `Network error: Failed to connect to API Gateway at ${API_GATEWAY_URL}`;
              }
              
              // Handle 404 separately
              if (error.response.status === 404) {
                return `Utility not found: ${utility_id}`;
              }
              
              return `API Gateway error: ${error.response.status} - ${error.response.data?.error || error.message}`;
            }
            
            // Generic error
            return `Error while getting utility info: ${error instanceof Error ? error.message : String(error)}`;
          }
        }
      },
      
      // Call a specific utility with parameters
      utility_call_utility: {
        description: 'Call a specific utility with parameters.',
        parameters: z.object({
          utility_id: z.string().describe('The ID of the utility to call'),
          parameters: z.record(z.any()).describe('Parameters to pass to the utility')
        }),
        execute: async ({ utility_id, parameters }) => {
          try {
            // Check if we have valid data
            if (!utility_id) {
              return 'Error: utility_id is required';
            }
            
            console.log(`Calling API Gateway for utility: ${utility_id} with parameters:`, parameters);
            
            // Call the API Gateway
            const response = await axios.post(`${API_GATEWAY_URL}/utility-tool/call-tool/${utility_id}`, {
              input: parameters,
              user_id: userId,
              conversation_id: conversationId
            }, {
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey
              }
            });
            
            // Return the response data as a string
            return JSON.stringify(response.data, null, 2);
          } catch (error) {
            console.error(`Error calling utility ${utility_id}:`, error);
            
            if (axios.isAxiosError(error)) {
              // Handle network errors or API errors
              if (!error.response) {
                return `Network error: Failed to connect to API Gateway at ${API_GATEWAY_URL}`;
              }
              
              return `API Gateway error: ${error.response.status} - ${error.response.data?.error || error.message}`;
            }
            
            // Generic error
            return `Error while calling utility: ${error instanceof Error ? error.message : String(error)}`;
          }
        }
      }
    };
    
    // Use the streamText implementation from Vercel AI SDK with tools
    return streamText({
      model: anthropic(ModelName.CLAUDE_3_7_SONNET_20250219),
      messages: [{ role: 'user', content: message }],
      tools,
      providerOptions: {
        anthropic: {
          // Enhanced thinking capabilities for better reasoning
          thinking: { 
            type: 'enabled', 
            budgetTokens: 12000 
          },
        },
      },
      // @ts-ignore
      maxSteps: 25, // Allow multi-step tool usage
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