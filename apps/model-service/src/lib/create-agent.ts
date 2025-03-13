/**
 * Agent Creation Utility
 * 
 * This file contains utilities for creating and configuring agents
 * based on the AgentConfig type.
 */

import { ChatAnthropic } from "@langchain/anthropic";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AgentConfig, ToolConfig } from './agent-config';

/**
 * Creates a function to process user input with a configured agent
 * 
 * @param config The agent configuration
 * @returns A function that processes user input and returns the model's response
 */
export function createAgent(config: AgentConfig) {
  // Extract configuration
  const { 
    modelConfig, 
    tools, 
    systemPrompt, 
    callbacks,
    verbose = false,
    requestIdPrefix = "req_claude_"
  } = config;
  
  // Filter enabled tools
  const enabledTools = tools
    .filter(toolConfig => toolConfig.enabled !== false)
    .map(toolConfig => toolConfig.tool);
  
  // Build tool descriptions for the system prompt
  const toolDescriptions = enabledTools
    .map(tool => `- ${tool.name}: ${tool.description}`)
    .join('\n');
  
  // Create the full system prompt with tool descriptions
  const fullSystemPrompt = `${systemPrompt}

Available tools:
${toolDescriptions}

Always explain your reasoning before taking actions.`;
  
  // Log system prompt if verbose
  if (verbose) {
    console.log('System Prompt:', fullSystemPrompt);
    console.log('Available Tools:', enabledTools.map(t => t.name).join(', '));
  }
  
  // Create the model instance with proper configuration
  const model = new ChatAnthropic({
    modelName: modelConfig.modelName,
    anthropicApiKey: modelConfig.apiKey,
    temperature: modelConfig.temperature,
    maxTokens: modelConfig.maxTokens,
    ...modelConfig.modelParams,
  });
  
  /**
   * Process user input with the configured agent
   * 
   * @param input The user's input text
   * @returns The agent's response
   */
  return async function processInput(input: string) {
    try {
      // Call onStart callback if provided
      callbacks?.onStart?.(input);
      
      if (verbose) {
        console.log(`Processing input: "${input}"`);
      }
      
      // Create messages array with system prompt and user input
      const messages = [
        new SystemMessage(fullSystemPrompt),
        new HumanMessage(input)
      ];
      
      // Get response from model
      const response = await model.invoke(messages);
      
      // Extract response content
      const responseContent = response.content.toString();
      
      // Count tokens (approximate method)
      const promptTokens = input.split(/\s+/).length + fullSystemPrompt.split(/\s+/).length;
      const responseTokens = responseContent.split(/\s+/).length;
      
      // Create result object
      const result = {
        model: modelConfig.modelName,
        generated_text: responseContent,
        tokens: {
          prompt_tokens: promptTokens,
          completion_tokens: responseTokens,
          total_tokens: promptTokens + responseTokens
        },
        request_id: `${requestIdPrefix}${Date.now()}`
      };
      
      // Call onComplete callback if provided
      callbacks?.onComplete?.(result);
      
      return result;
    } catch (error) {
      console.error("Error in agent:", error);
      
      // Call onError callback if provided
      if (callbacks?.onError && error instanceof Error) {
        callbacks.onError(error);
      }
      
      // Extract error message
      let errorDetails = "An unknown error occurred";
      if (error instanceof Error) {
        errorDetails = error.message;
      }
      
      // Return error response
      return {
        model: `${modelConfig.modelName}-fallback`,
        generated_text: `I encountered an error while processing your request: "${input}". 
        
This could be due to API issues or technical problems. Error details: ${errorDetails}

Please try again later or contact support if the issue persists.`,
        tokens: {
          prompt_tokens: input.split(' ').length,
          completion_tokens: 50,
          total_tokens: input.split(' ').length + 50
        },
        request_id: `req_error_${Date.now()}`
      };
    }
  };
} 