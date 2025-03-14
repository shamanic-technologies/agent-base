/**
 * ReAct Agent Implementation
 * 
 * Implementation of a ReAct agent using LangGraph's createReactAgent with enhanced
 * error handling and Claude-specific optimizations.
 */

import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage, AIMessage, BaseMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import { Tool } from "@langchain/core/tools";
import { ToolNode, createReactAgent } from "@langchain/langgraph/prebuilt";
import { 
  StateGraph, 
  MemorySaver,
  Annotation,
  messagesStateReducer
} from "@langchain/langgraph";
import { StreamEvent } from "@langchain/core/tracers/log_stream";

// Import existing tools from utility directory
import { UtilityHelloWorldEcho } from "./lib/utility";

/**
 * Interface for React Agent configuration
 */
interface ReactAgentConfig {
  tools: Tool[];  /** List of tools the agent can use */
  nodeId?: string; /** Optional ID for the agent node */
  nodeType?: string;/** Optional type for the agent node */
  parentNodeId?: string;  /** Optional parent node ID */
  parentNodeType?: string; /** Optional parent node type */
  modelName?: string;/** Model name (defaults to Claude 3.7 Sonnet) */
  temperature?: number;  /** Temperature setting (defaults to 0) */
  systemPrompt?: string; /** Custom system prompt */
  conversationId?: string;/** Conversation ID for continuity */
}

/**
 * Formats AI message content into a proper string representation
 * Handles different content formats (string, array of content blocks, etc.)
 * 
 * @param content - The message content to format
 * @returns A properly formatted string
 */
function formatAIMessageContent(content: any): string {
  if (typeof content === 'string') {
    return content;
  } else if (Array.isArray(content)) {
    // Handle array of content blocks (Claude format)
    return content
      .filter(block => block && typeof block === 'object' && block.type === 'text')
      .map(block => block.text)
      .join('\n');
  } else {
    // Fallback for unexpected formats
    return JSON.stringify(content);
  }
}

/**
 * Ensures tool input is always a valid dictionary (non-array object)
 * This prevents the "Input should be a valid dictionary" error from Claude
 *
 * @param input - The input received from the agent
 * @returns Properly formatted input object
 */
function ensureValidDictionary(input: any): object {
  // Return empty object for null, undefined, or primitive values
  if (input === null || input === undefined || 
      typeof input === 'string' || 
      typeof input === 'number' || 
      typeof input === 'boolean' ||
      Array.isArray(input)) {
    return {};
  }
  
  // If already a non-array object, return as is
  if (typeof input === 'object') {
    return input;
  }
  
  // Default fallback - empty object
  return {};
}

/**
 * Process messages to ensure all tool inputs are valid objects
 * Required for Claude to avoid "Input should be a valid dictionary" errors
 * 
 * @param messages - Array of messages to process
 * @returns Processed messages with valid tool inputs
 */
function preprocessMessagesForClaude(messages: any[]): any[] {
  if (!Array.isArray(messages)) {
    return messages;
  }
  
  return messages.map(message => {
    if (!message) return message;
    
    try {
      // Create a deep copy to avoid mutating the original
      const newMessage = JSON.parse(JSON.stringify(message));
      
      // Handle AIMessage with tool_calls field (general format)
      if (newMessage.kwargs?.tool_calls && Array.isArray(newMessage.kwargs.tool_calls)) {
        newMessage.kwargs.tool_calls = newMessage.kwargs.tool_calls.map((toolCall: any) => {
          toolCall.args = ensureValidDictionary(toolCall.args);
          return toolCall;
        });
      }
      
      // Handle content array with tool_use (Anthropic specific format)
      if (Array.isArray(newMessage.content)) {
        newMessage.content = newMessage.content.map((item: any) => {
          if (item.type === 'tool_use') {
            item.input = ensureValidDictionary(item.input);
          }
          return item;
        });
      }
      
      // Handle direct tool_calls field (modern format)
      if (Array.isArray(newMessage.tool_calls)) {
        newMessage.tool_calls = newMessage.tool_calls.map((toolCall: any) => {
          toolCall.args = ensureValidDictionary(toolCall.args);
          return toolCall;
        });
      }
      
      return newMessage;
    } catch (e) {
      return message; // Return original if error
    }
  });
}

/**
 * Creates a streamable ReAct agent with enhanced error handling
 */
export function createReactAgentWrapper(config: ReactAgentConfig) {
  const {
    tools,
    nodeId,
    nodeType,
    parentNodeId,
    parentNodeType,
    modelName = "claude-3-7-sonnet-20250219",
    temperature = 0,
    systemPrompt,
    conversationId
  } = config;
  
  // Set up conversation ID
  const actualConversationId = conversationId || `session-${Date.now()}`;

  // Create the Claude model
  const model = new ChatAnthropic({
    modelName,
    temperature,
    streaming: true
  });

  // Define state annotation for the graph
  const StateAnnotation = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
      reducer: messagesStateReducer,
    }),
  });

  // Create the ReAct agent with optimized tool input preprocessing
  const reactAgent = createReactAgent({
    llm: model, 
    tools,
    // Apply tool preprocessing through state modifier instead
    stateModifier: systemPrompt,
  });

  // Create a dedicated ToolNode for executing tools
  const toolNode = new ToolNode(tools);

  // Define routing function with input validation for tool calls
  const shouldContinue = (state: typeof StateAnnotation.State) => {
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1];
    
    // Check if the last message has tool calls
    if (lastMessage instanceof AIMessage && lastMessage.tool_calls?.length) {
      // Process tool calls to ensure all inputs are valid dictionaries
      lastMessage.tool_calls = lastMessage.tool_calls.map(toolCall => {
        toolCall.args = ensureValidDictionary(toolCall.args);
        return toolCall;
      });
      
      // Also process content array for Claude format
      if (Array.isArray(lastMessage.content)) {
        lastMessage.content = lastMessage.content.map(item => {
          if (item.type === 'tool_use') {
            item.input = ensureValidDictionary(item.input);
          }
          return item;
        });
      }
      
      return "tools";
    }
    
    // Otherwise, end the workflow
    return "__end__";
  };

  // Create the workflow graph using the latest LangGraph patterns
  const workflow = new StateGraph(StateAnnotation)
    .addNode("agent", reactAgent)
    .addNode("tools", toolNode)
    .addEdge("__start__", "agent")
    .addConditionalEdges("agent", shouldContinue, ["tools", "__end__"])
    .addEdge("tools", "agent");

  const checkpointer = new MemorySaver();
  
  // Compile the graph with memory
  const graph = workflow.compile({
    checkpointer
  });

  /**
   * Streaming agent function with robust error handling
   * 
   * @param messages - Array of messages from the user and assistant
   * @param messageHistory - Optional message history
   * @returns AsyncGenerator that yields LangGraph event objects as JSON strings
   */
  async function* streamAgent(
    messages: BaseMessage[], 
    messageHistory: BaseMessage[] = []
  ): AsyncGenerator<string, void, unknown> {
    try {
      // Combine history with current messages if needed
      let allMessages = messages;
      if (messageHistory && messageHistory.length > 0) {
        allMessages = [...messageHistory, ...messages];
      }
      
      // Thoroughly preprocess messages to prevent dictionary errors
      allMessages = preprocessMessagesForClaude(allMessages);
      
      // Stream responses with modern stream API using specific Claude optimizations
      const stream = await graph.stream(
        { messages: allMessages },
        { 
          configurable: { 
            thread_id: actualConversationId,
            // Disable parallel tool use for Claude to reduce errors
            disable_parallel_tool_use: true,
            // Set streaming mode to include both messages and events
            stream_mode: ["messages", "events"]
          },
          metadata: {
            node_id: nodeId,
            node_type: nodeType,
            parent_node_id: parentNodeId,
            parent_node_type: parentNodeType
          }
        }
      );

      // Keep track of all chunks
      const chunks = [];

      // Pass through LangGraph stream chunks
      for await (const chunk of stream) {
        chunks.push(chunk);
        yield JSON.stringify(chunk);
      }
    } catch (error) {
      // Comprehensive error handling for streaming
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorEvent = {
        event: "on_chain_error",
        name: "ReActStreamingAgent",
        run_id: `error-${Date.now()}`,
        tags: [],
        metadata: {
          node_id: nodeId,
          node_type: nodeType,
          error: true,
          error_details: errorMessage.includes("valid dictionary") 
            ? "Invalid tool input format - input should be a valid dictionary" 
            : errorMessage
        },
        data: {
          error: errorMessage
        }
      };
      
      yield JSON.stringify(errorEvent);
    }
  }

  /**
   * Invoke the agent with the given messages
   */
  async function invokeAgent(messages: BaseMessage[]) {
    // Thoroughly preprocess messages
    const processedMessages = preprocessMessagesForClaude(messages);
    
    try {
      // Execute the agent with optimized config for Claude
      const result = await graph.invoke(
        { messages: processedMessages },
        {
          configurable: {
            // Use the same conversation ID for consistency
            thread_id: actualConversationId,
            // Disable parallel tool use for Claude to reduce errors
            disable_parallel_tool_use: true
          }
        }
      );
      
      return {
        result,
        conversationId: actualConversationId
      };
    } catch (error) {
      // Detailed error handling for invocation
      console.error("Agent execution error:", error);
      
      // Create a fallback response with error details
      const errorMessage = error instanceof Error ? error.message : String(error);
      let fallbackContent = "I encountered an issue while processing your request.";
      
      // Provide more context for common Claude errors
      if (errorMessage.includes("valid dictionary")) {
        fallbackContent = "I encountered an issue with the tool input format. This is a technical problem that our team is working to resolve.";
      }
      
      const fallbackResponse = new AIMessage({
        content: fallbackContent
      });
      
      return {
        result: {
          messages: [...processedMessages, fallbackResponse]
        },
        conversationId: actualConversationId,
        error: errorMessage
      };
    }
  }
  
  return {
    invokeAgent,
    streamAgent
  };
}

/**
 * Process a user prompt with the enhanced ReAct agent using createReactAgent
 * 
 * @param prompt The user prompt to process
 * @param threadId Optional thread ID for stateful conversations
 * @returns A structured response with the generated text
 */
export async function processWithReActAgent(prompt: string, conversationId?: string) {
  try {
    // Check if API key is available
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn("⚠️ No ANTHROPIC_API_KEY found in environment variables");
      throw new Error("Anthropic API key not found in environment variables");
    }

    // Set up tools
    const tools = [
      new UtilityHelloWorldEcho()
    ];
    
    // Create the ReAct agent wrapper with enhanced error handling
    const { invokeAgent } = createReactAgentWrapper({
      tools,
      modelName: "claude-3-7-sonnet-20250219",
      temperature: 0,
      conversationId: conversationId  // Pass the conversation ID to the wrapper
    });
    
    // Create a human message from the prompt
    const message = new HumanMessage(prompt);
    
    // Invoke the agent - no need to pass conversationId again as it's already in the wrapper
    console.log("Invoking Enhanced LangGraph ReAct agent...");
    const { result } = await invokeAgent([message]);
    
    // Get the last message from the result
    const lastMessage = result.messages[result.messages.length - 1];
    
    // Format the content properly using the utility function
    const formattedContent = formatAIMessageContent(lastMessage.content);
    
    // Return a formatted response
    return {
      model: "claude-3-7-sonnet-20250219",
      generated_text: formattedContent,
      tokens: {
        prompt_tokens: prompt.split(/\s+/).length,
        completion_tokens: formattedContent.split(/\s+/).length,
        total_tokens: prompt.split(/\s+/).length + formattedContent.split(/\s+/).length
      },
      request_id: `req_${Date.now()}`
    };
  } catch (error) {
    console.error("Error in ReAct agent:", error);
    throw error;
  }
} 