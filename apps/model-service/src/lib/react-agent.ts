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
  messagesStateReducer,
  StreamMode
} from "@langchain/langgraph";
import { StreamEvent } from "@langchain/core/tracers/log_stream";

// Import existing utilities
import { UtilityListUtilities, UtilityGetUtilityInfo, UtilityCallUtility } from "./utility/index.js";
import { formatAIMessageContent } from "./utils/formatters.js";

import {
  ReactAgentWrapperConfig,
  ChatAnthropicConfig,
  ReactAgentConfig,
  GraphStreamConfig,
  ThreadId,
  NodeId,
  NodeType,
  ParentNodeId,
  ParentNodeType,
  StreamAgentFunctionConfig,
  ModelName,
  ReactAgentWrapper
} from "../types/agent-config.js";



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
      typeof input === 'boolean') {
    return {};
  }
  
  // If it's already an object and not an array, return it as is
  if (typeof input === 'object' && !Array.isArray(input)) {
    return input;
  }
  
  // Convert arrays to objects with numbered keys
  if (Array.isArray(input)) {
    return input.reduce((obj, val, idx) => {
      obj[idx.toString()] = val;
      return obj;
    }, {} as Record<string, any>);
  }
  
  // Default fallback - empty object
  return {};
}

/**
 * Preprocesses messages to ensure Claude compatibility
 * This helps prevent common Claude errors with message formatting
 * 
 * @param messages - The array of messages to preprocess
 * @returns Processed messages array
 */
function preprocessMessagesForClaude(messages: BaseMessage[]): BaseMessage[] {
  return messages.map(message => {
    // Only process AIMessages with content
    if (message instanceof AIMessage && message.content) {
      // Handle tool calls
      if (message.tool_calls && message.tool_calls.length) {
        // Process each tool call to ensure valid dictionary
        message.tool_calls = message.tool_calls.map(toolCall => {
          toolCall.args = ensureValidDictionary(toolCall.args);
          return toolCall;
        });
      }
      
      // Handle Claude's content array format
      if (Array.isArray(message.content)) {
        message.content = message.content.map(item => {
          if (item.type === 'tool_use') {
            item.input = ensureValidDictionary(item.input);
          }
          return item;
        });
      }
    }
    
    return message;
  });
}

// Simple singleton implementation - will be initialized on first use
let reactAgentWrapper: ReactAgentWrapper;

/**
 * Get or create the React Agent wrapper
 */
function getReactAgentWrapper(config: ReactAgentWrapperConfig): ReactAgentWrapper {
  if (!reactAgentWrapper) {
    reactAgentWrapper = createReactAgentWrapper(config);
    console.log("Created React Agent wrapper");
  }
  return reactAgentWrapper;
}

/**
 * Internal implementation of React Agent wrapper creation
 * Not to be called directly - use getReactAgentWrapper instead
 */
function createReactAgentWrapper(config: ReactAgentWrapperConfig): ReactAgentWrapper {
  const {
    tools,
    nodeId,
    nodeType,
    parentNodeId,
    parentNodeType,
    modelName = "claude-3-7-sonnet-20250219",
    temperature = 0,
    overwrittingSystemPrompt: systemPrompt
  } = config;
  
  // Create the Claude model
  const anthropicModel : ChatAnthropic = new ChatAnthropic({
    modelName,
    temperature,
    streaming: true
  } as ChatAnthropicConfig);

  // Define state annotation for the graph
  const StateAnnotation = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
      reducer: messagesStateReducer,
    }),
  });

  // Create the ReAct agent with optimized tool input preprocessing
  const reactAgent = createReactAgent({
    llm: anthropicModel, 
    tools,
    stateModifier: systemPrompt, // Apply tool preprocessing through state modifier in ReAct Agents
  } as ReactAgentConfig);

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

  // Create a persistent MemorySaver that will be shared across all conversations
  const checkpointer = new MemorySaver();
  
  // Compile the graph with memory
  const graph = workflow.compile({
    checkpointer
  });

  /**
   * Streaming agent function with robust error handling
   * 
   * @param config - Configuration object for streaming
   * @param config.messages - Array of messages from the user and assistant
   * @param config.modes - Stream modes to enable (e.g. ["messages"], ["events"], or ["messages", "events"])
   * @param config.messageHistory - Optional message history
   * @param conversationId - Thread ID for maintaining conversation state
   * @returns AsyncGenerator that yields LangGraph event objects as JSON strings
   */
  async function* streamAgentFunction(
    config: StreamAgentFunctionConfig,
    conversationId?: string
  ): AsyncGenerator<string, void, unknown> {
    try {
      const { 
        messages,
        modes = 'messages',
        messageHistory = []
      } = config;

      // Use provided conversationId or generate a default one
      const actualConversationId: ThreadId = conversationId || `session-${Date.now()}`;

      // Validate modes
      if (!Array.isArray(modes) || modes.length === 0) {
        throw new Error("Modes parameter must be a non-empty array");
      }
      
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
          streamMode: modes,
          configurable: { 
            thread_id: actualConversationId,
            disable_parallel_tool_use: true // Disable parallel tool use for Claude to reduce errors
          },
          metadata: {
            node_id: nodeId,
            node_type: nodeType,
            parent_node_id: parentNodeId,
            parent_node_type: parentNodeType
          }
        } as GraphStreamConfig
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
   * 
   * @param messages - The messages to process
   * @param conversationId - Thread ID for maintaining conversation state
   * @returns The agent response
   */
  async function invokeAgentFunction(messages: BaseMessage[], conversationId?: string) {
    // Use provided conversationId or generate a default one
    const actualConversationId: ThreadId = conversationId || `session-${Date.now()}`;
    
    // Thoroughly preprocess messages
    const processedMessages = preprocessMessagesForClaude(messages);
    
    try {
      // Execute the agent with optimized config for Claude
      const result = await graph.invoke(
        { messages: processedMessages },
        {
          streamMode: 'values',
          configurable: {
            // Use the conversation ID for memory lookup
            thread_id: actualConversationId,
            // Disable parallel tool use for Claude to reduce errors
            disable_parallel_tool_use: true
          },
          metadata: {
            node_id: nodeId,
            node_type: nodeType,
            parent_node_id: parentNodeId,
            parent_node_type: parentNodeType
          }
        }
      );
      
      // Return the raw result directly without wrapper
      return result;
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
      
      // Return raw result for error case as well
      return {
        messages: [fallbackResponse]
      };
    }
  }

  return {
    streamAgentFunction,
    invokeAgentFunction
  };
}

/**
 * Process a user prompt with the enhanced ReAct agent
 * 
 * @param prompt The user prompt to process
 * @param conversationId Optional thread ID for stateful conversations
 * @returns The agent's response
 */
export async function processWithReActAgent(
  prompt: string, 
  conversationId?: string
) {
  try {
    // Check if API key is available
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn("⚠️ No ANTHROPIC_API_KEY found in environment variables");
      throw new Error("Anthropic API key not found in environment variables");
    }

    const nodeId = 'agent_react' as NodeId;
    const nodeType = NodeType.AGENT;
    
    // Create utilities
    const listUtilities = new UtilityListUtilities({
      conversationId: conversationId,
      parentNodeId: nodeId,
      parentNodeType: nodeType
    });
    const getUtilityInfo = new UtilityGetUtilityInfo({
      conversationId: conversationId,
      parentNodeId: nodeId,
      parentNodeType: nodeType
    });
    const callUtility = new UtilityCallUtility({
      conversationId: conversationId,
      parentNodeId: nodeId,
      parentNodeType: nodeType
    });
    
    // Use all utilities
    const tools = [
      listUtilities,
      getUtilityInfo,
      callUtility
    ];
    
    // Get the singleton React agent wrapper
    const { invokeAgentFunction } = getReactAgentWrapper({
      tools,
      nodeId,
      nodeType,
      parentNodeId: nodeId,
      parentNodeType: nodeType,
      modelName: ModelName.CLAUDE_3_7_SONNET_20250219,
      temperature: 0
    });
    
    // Create a human message from the prompt
    const message = new HumanMessage(prompt);
    
    // Get previous conversation history if available
    console.log(`Processing prompt with thread ID: ${conversationId || 'new session'}`);
    
    // Invoke the agent with the message and conversation ID
    const response = await invokeAgentFunction([message], conversationId);
    
    // Return the raw response directly without wrapper
    return response;
  } catch (error) {
    console.error("Error in ReAct agent:", error);
    throw error;
  }
}

/**
 * Stream a user prompt with the enhanced ReAct agent
 * Returns the raw stream chunks for client-side processing
 * 
 * @param prompt The user prompt to process
 * @param conversationId Optional thread ID for stateful conversations
 * @returns AsyncGenerator that yields LangGraph event objects as JSON strings
 */
export async function* streamWithReActAgent(
  prompt: string,
  conversationId?: string,
  streamModes?: any
): AsyncGenerator<string, void, unknown> {
  try {
    // Check if API key is available
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn("⚠️ No ANTHROPIC_API_KEY found in environment variables");
      throw new Error("Anthropic API key not found in environment variables");
    }

    const nodeId = 'agent_react' as NodeId;
    const nodeType = NodeType.AGENT;
    
    // Create utilities
    const listUtilities = new UtilityListUtilities({
      conversationId: conversationId,
      parentNodeId: nodeId,
      parentNodeType: nodeType
    });
    const getUtilityInfo = new UtilityGetUtilityInfo({
      conversationId: conversationId,
      parentNodeId: nodeId,
      parentNodeType: nodeType
    });
    const callUtility = new UtilityCallUtility({
      conversationId: conversationId,
      parentNodeId: nodeId,
      parentNodeType: nodeType
    });
    
    // Use all utilities
    const tools = [
      listUtilities,
      getUtilityInfo,
      callUtility
    ];
    
    // Get the singleton React agent wrapper
    const { streamAgentFunction } = getReactAgentWrapper({
      tools,
      nodeId,
      nodeType,
      parentNodeId: nodeId,
      parentNodeType: nodeType,
      modelName: ModelName.CLAUDE_3_7_SONNET_20250219,
      temperature: 0
    });
    
    // Create a human message from the prompt
    const message = new HumanMessage(prompt);
    
    // Stream the response with the message and conversation ID
    const stream = streamAgentFunction({
      messages: [message],
      modes: streamModes || ['messages', 'events']
    }, conversationId);
    
    // Yield each chunk
    for await (const chunk of stream) {
      yield chunk;
    }
  } catch (error) {
    console.error("Error in ReAct agent streaming:", error);
    
    const errorEvent = {
      event: "on_chain_error",
      name: "ReActStreamingAgent",
      run_id: `error-${Date.now()}`,
      tags: [],
      metadata: {
        error: true,
        error_details: error instanceof Error ? error.message : String(error)
      },
      data: {
        error: error instanceof Error ? error.message : String(error)
      }
    };
    
    yield JSON.stringify(errorEvent);
  }
} 