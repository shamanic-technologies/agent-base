/**
 * Agent Configuration Types
 * 
 * This file contains type definitions for configuring agents.
 * These types help standardize how agents are configured across the application.
 */

import { Tool } from "@langchain/core/tools";
import { ChatAnthropic } from "@langchain/anthropic";
import { 
  StateGraph, 
  MemorySaver,
  Annotation,
  messagesStateReducer,
  StreamMode
} from "@langchain/langgraph";
import { HumanMessage, AIMessage, BaseMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";

/**
 * Interface for React Agent configuration
 */
export interface ReactAgentWrapperConfig {
  tools: Tool[];  /** List of tools the agent can use */
  nodeId: NodeId; /** Optional ID for the agent node */
  nodeType: NodeType;/** Optional type for the agent node */
  parentNodeId: ParentNodeId;  /** Optional parent node ID */
  parentNodeType: ParentNodeType; /** Optional parent node type */
  temperature?: number;  /** Temperature setting (defaults to 0) */
  modelName?: ModelName;/** Model name (defaults to Claude 3.7 Sonnet) */
  overwrittingSystemPrompt?: ReactAgentOverwrittingSystemPrompt; /** Custom system prompt */
}

export interface StreamAgentFunctionConfig {
  messages: BaseMessage[];
  messageHistory?: BaseMessage[];
  modes?: StreamMode[];
}

export interface ChatAnthropicConfig {
  modelName: string;
  temperature: number;
  streaming: boolean;
}

export type ReactAgentOverwrittingSystemPrompt = SystemMessage | null;

export interface ReactAgentConfig {
  llm: ChatAnthropic;
  tools: Tool[];
  stateModifier: ReactAgentOverwrittingSystemPrompt;
}

export enum ModelName {
  CLAUDE_3_7_SONNET_20250219 = 'claude-3-7-sonnet-20250219'
}

export type ThreadId = string;
export type NodeId = string;
export type ParentNodeId = string | null;
export type ParentNodeType = NodeType | null;

export enum NodeType {
  AGENT = "agent",
  TOOL = "tool",
  UTILITY = "utility"
}

export interface GraphStreamConfig { 
  streamMode: StreamMode[],
  configurable: { 
    thread_id: ThreadId,
    disable_parallel_tool_use: boolean // Disable parallel tool use for Claude to reduce errors
  },
  metadata: {
    node_id: NodeId,
    node_type: NodeType,
    parent_node_id: ParentNodeId,
    parent_node_type: ParentNodeType
  }
}

/**
 * Interface for the agent wrapper functions
 */
export interface ReactAgentWrapper {
  streamAgentFunction: (
    config: StreamAgentFunctionConfig,
    conversationId?: string
  ) => AsyncGenerator<string, void, unknown>;
  invokeAgentFunction: (
    messages: BaseMessage[],
    conversationId?: string
  ) => Promise<any>;
}