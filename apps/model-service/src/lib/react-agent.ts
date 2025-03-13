/**
 * ReAct Agent Implementation
 * 
 * This file implements a ReAct agent using LangGraph patterns.
 * The agent follows the reasoning + acting pattern to process user prompts.
 */

import { ChatAnthropic } from "@langchain/anthropic";
import { Tool } from "@langchain/core/tools";
import { 
  BaseMessage, 
  AIMessage, 
  HumanMessage, 
  ToolMessage,
  SystemMessage
} from "@langchain/core/messages";
import { ToolCall } from "@langchain/core/messages/tool";
import dotenv from 'dotenv';

// Import utility tools
import { HelloWorldGreetingTool, HelloWorldEchoTool } from './utility';

// Import agent configuration
import { AgentConfig } from './agent-config';

// Import LangGraph components
import { 
  entrypoint, 
  task, 
  addMessages,
  MemorySaver,
  getPreviousState
} from "@langchain/langgraph";

// Define the model name
const CLAUDE_MODEL_NAME = "claude-3-7-sonnet-20250219";


/**
 * Initialize tools
 */
const tools = [
  new HelloWorldGreetingTool(),
  new HelloWorldEchoTool()
];

/**
 * Create a lookup map to find tools by name
 */
const toolsByName = Object.fromEntries(tools.map((tool) => [tool.name, tool]));

/**
 * Check if we have a valid API key
 */
if (!process.env.ANTHROPIC_API_KEY) {
  console.warn("⚠️ No Anthropic API key found. Set the ANTHROPIC_API_KEY environment variable for full functionality.");
  console.warn("Using a placeholder model for development.");
}

/**
 * Create the chat model
 */
const model = new ChatAnthropic({
  modelName: CLAUDE_MODEL_NAME,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  temperature: 0,
});

/**
 * Task: Call the model with the current messages
 */
const callModel = task("callModel", async (messages: BaseMessage[]) => {
  console.log("Calling model with messages:", messages.map(m => {
    const isSystem = m instanceof SystemMessage ? 'System' : 
                     m instanceof HumanMessage ? 'Human' : 
                     m instanceof AIMessage ? 'AI' : 
                     m instanceof ToolMessage ? 'Tool' : 'Unknown';
    
    return `${isSystem}: ${typeof m.content === 'string' ? m.content.substring(0, 50) + '...' : '[Complex content]'}`;
  }));
  
  try {
    const response = await model.bindTools(tools).invoke(messages);
    return response;
  } catch (error) {
    console.error("Error calling model:", error);
    
    // If API key is missing, return a mock response
    if (error.message?.includes("Anthropic API key not found")) {
      console.log("Using mock response (API key issue)");
      // Create a mock AI message with a fake tool call or response
      const mockResponse = new AIMessage({
        content: "I'll help you with that! Let me reason through it step by step...",
      });
      
      // For debugging/testing only - you'd want a real integration in production
      return mockResponse;
    }
    
    throw error;
  }
});

/**
 * Task: Execute a tool call
 */
const callTool = task(
  "callTool",
  async (toolCall: ToolCall): Promise<ToolMessage> => {
    console.log(`Executing tool call: ${toolCall.name}`);
    const tool = toolsByName[toolCall.name];
    if (!tool) {
      return new ToolMessage({
        content: `Error: Tool '${toolCall.name}' not found`,
        tool_call_id: toolCall.id
      });
    }
    
    try {
      const observation = await tool.invoke(toolCall.args);
      return new ToolMessage({ 
        content: observation, 
        tool_call_id: toolCall.id 
      });
    } catch (error) {
      return new ToolMessage({
        content: `Error executing tool ${toolCall.name}: ${error instanceof Error ? error.message : String(error)}`,
        tool_call_id: toolCall.id
      });
    }
  }
);

/**
 * Create a checkpointer for conversation memory
 */
const checkpointer = new MemorySaver();

/**
 * The ReAct agent with memory
 */
export const reactAgent = entrypoint({
  name: "reactAgent",
  checkpointer,
}, async (input: { messages: BaseMessage[] }) => {
  // Get the previous messages or start with an empty array
  const previous = getPreviousState<BaseMessage[]>() ?? [];
  
  // System message that instructs the model how to use tools
  const systemMessage = new SystemMessage(`You are a helpful AI assistant that follows the ReAct framework (Reasoning + Acting).
For each request, follow these steps:

1. THINK: Always explain your reasoning process first in detail
2. PLAN: Break down complex requests into smaller, manageable steps
3. ACT: Use the appropriate tools when needed to solve the problem
4. CONCLUDE: Summarize your findings and provide a clear answer

Available tools:
${tools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}

Always show your reasoning clearly, especially for mathematical or logical problems.`);
  
  // Start with system message and previous messages
  let currentMessages = [systemMessage, ...previous, ...input.messages];
  
  // Call the model with the current messages
  let llmResponse = await callModel(currentMessages);
  
  // Loop until we get a response without tool calls
  while (true) {
    // If there are no tool calls, we're done
    if (!llmResponse.tool_calls?.length) {
      break;
    }

    // Execute all tool calls in parallel
    const toolResults = await Promise.all(
      llmResponse.tool_calls.map((toolCall) => callTool(toolCall))
    );

    // Add the tool responses to our message history
    currentMessages = addMessages(currentMessages, [llmResponse, ...toolResults]);

    // Call the model again with the updated message history
    llmResponse = await callModel(currentMessages);
  }

  // Add the final response to the message history for persistence
  currentMessages = addMessages(currentMessages, [llmResponse]);

  // Return both the final response and save the message history
  return entrypoint.final({
    value: { messages: currentMessages },
    save: currentMessages.filter(msg => !(msg instanceof SystemMessage)), // Don't save system message
  });
});

/**
 * Simplified interface for the ReAct agent
 * 
 * @param prompt The prompt to process
 * @param threadId Optional thread ID for conversation persistence
 * @returns The agent's response
 */
export async function processWithReActAgent(prompt: string, threadId?: string) {
  // Create a human message from the prompt
  const message = new HumanMessage({ content: prompt });
  
  // Set up configuration for thread ID if provided
  const config = threadId ? { configurable: { thread_id: threadId } } : undefined;
  
  try {
    // Run the agent
    const result = await reactAgent.invoke({ messages: [message] }, config);
    
    // Extract the last message (the model's response)
    const lastMessage = result.messages[result.messages.length - 1];
    
    if (lastMessage instanceof AIMessage) {
      // Format the response for API compatibility
      return {
        model: CLAUDE_MODEL_NAME,
        generated_text: lastMessage.content.toString(),
        tokens: {
          prompt_tokens: prompt.split(/\s+/).length,
          completion_tokens: lastMessage.content.toString().split(/\s+/).length,
          total_tokens: prompt.split(/\s+/).length + lastMessage.content.toString().split(/\s+/).length
        },
        request_id: `req_claude_${Date.now()}`
      };
    } else {
      throw new Error("Unexpected message type in agent response");
    }
  } catch (error) {
    console.error("Error in ReAct agent:", error);
  }
} 