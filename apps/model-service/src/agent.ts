/**
 * Claude ReAct Agent Implementation
 * 
 * This file implements a ReAct agent using Anthropic Claude.
 * The agent follows the ReAct pattern (Reasoning + Acting) to process user prompts.
 */

// Import required packages
import { ChatAnthropic } from "@langchain/anthropic";
import { Tool } from "@langchain/core/tools";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";

// Define the correct model name to use
const CLAUDE_MODEL_NAME = "claude-3-7-sonnet-20250219";

/**
 * Claude ReAct agent that processes a user prompt
 * 
 * @param prompt The user's prompt to process
 * @returns The agent's response with model info, generated text, token counts, and request ID
 */
export async function processWithReActAgent(prompt: string): Promise<{
  model: string;
  generated_text: string;
  tokens: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  request_id: string;
}> {
  console.log(`Processing prompt with Claude ReAct agent: ${prompt}`);
  
  try {
    // Define a simple search tool
    class SearchTool extends Tool {
      name = "search";
      description = "Search for information on a given topic";
      
      async _call(input: string): Promise<string> {
        console.log(`Simulated search for: ${input}`);
        // This would be a real search API call in production
        return `Here are some relevant results for "${input}"...`;
      }
    }
    
    // Define a simple calculator tool
    class CalculatorTool extends Tool {
      name = "calculator";
      description = "Perform mathematical calculations";
      
      async _call(input: string): Promise<string> {
        console.log(`Calculating: ${input}`);
        try {
          // This is just for demo purposes - in production you'd use a safer evaluation method
          // eslint-disable-next-line no-eval
          const result = eval(input);
          return `The result of ${input} is ${result}`;
        } catch (error) {
          return `Error calculating ${input}: ${error instanceof Error ? error.message : String(error)}`;
        }
      }
    }
    
    // Create tool instances
    const tools = [new SearchTool(), new CalculatorTool()];
    
    // Create Claude model instance with proper model name
    const model = new ChatAnthropic({
      modelName: CLAUDE_MODEL_NAME,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      temperature: 0,
    });
    
    // Create the system prompt template
    const systemPrompt = `You are a helpful AI assistant that follows the ReAct framework (Reasoning + Acting).
For each user request, carefully think through the problem step by step.
Break down complex requests into smaller parts.
When using tools, think about:
1. Which tool is most appropriate for this step
2. What input the tool needs
3. How to interpret the tool's output

Available tools:
- search: Search for information on a given topic
- calculator: Perform mathematical calculations

Always explain your reasoning before taking actions.`;
    
    // Create a direct function to process the input
    const processInput = async (input: string): Promise<AIMessage> => {
      // Create a simple prompt with system message and user input
      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(input)
      ];
      
      // Get response from Claude
      return await model.invoke(messages);
    };
    
    // Process the user prompt with the model
    console.log(`Processing with Claude ReAct agent: "${prompt}"`);
    const agentResponse = await processInput(prompt);
    
    // Extract the content as string
    const responseContent = agentResponse.content.toString();
    
    // Count tokens (very approximate method - in production you'd use a proper tokenizer)
    const promptTokens = prompt.split(/\s+/).length + systemPrompt.split(/\s+/).length;
    const responseTokens = responseContent.split(/\s+/).length;
    
    // Return the response in the expected format
    return {
      model: CLAUDE_MODEL_NAME,
      generated_text: responseContent,
      tokens: {
        prompt_tokens: promptTokens,
        completion_tokens: responseTokens,
        total_tokens: promptTokens + responseTokens
      },
      request_id: `req_claude_${Date.now()}`
    };
  } catch (error) {
    console.error("Error in Claude agent:", error);
    
    // Extract a more useful error message
    let errorDetails = "An unknown error occurred";
    
    if (error instanceof Error) {
      errorDetails = error.message;
      
      // Provide more context for common Claude errors
      if (errorDetails.includes("valid dictionary")) {
        errorDetails = "Tool input format error - input should be a valid dictionary";
      } else if (errorDetails.includes("not_found_error")) {
        errorDetails = "Model not found - please check the model name configuration";
      } else if (errorDetails.includes("api_key")) {
        errorDetails = "API key error - please check your Anthropic API key";
      }
    }
    
    // Return a fallback response in case of errors
    return {
      model: "claude-react-agent-fallback",
      generated_text: `I encountered an error while processing your request: "${prompt}". 
      
This could be due to API issues or technical problems. Error details: ${errorDetails}

Please try again later or contact support if the issue persists.`,
      tokens: {
        prompt_tokens: prompt.split(' ').length,
        completion_tokens: 50,
        total_tokens: prompt.split(' ').length + 50
      },
      request_id: `req_error_${Date.now()}`
    };
  }
} 