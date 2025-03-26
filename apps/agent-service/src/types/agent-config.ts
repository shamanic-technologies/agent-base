/**
 * Agent Configuration Types
 * 
 * Core type definitions for the Claude 3.7 Sonnet streaming-only agent with Vercel AI SDK.
 * This service is 100% focused on streaming responses for real-time reasoning.
 */

/**
 * Claude model names
 */
export enum ModelName {
  CLAUDE_3_7_SONNET_20250219 = 'claude-3-7-sonnet-20250219'
}

/**
 * Node types for utility tools
 */
export enum NodeType {
  AGENT = "agent",
  TOOL = "tool",
  UTILITY = "utility"
}

/**
 * Node ID type (string alias for backward compatibility)
 */
export type NodeId = string;

/**
 * Parent Node ID type (string or null for backward compatibility)
 */
export type ParentNodeId = string | null;

/**
 * Parent Node Type (NodeType or null for backward compatibility)
 */
export type ParentNodeType = NodeType | null;

/**
 * Thread ID type (string alias for backward compatibility)
 */
export type ThreadId = string;

/**
 * Metadata for tool usage
 */
export interface ToolMetadata {
  node_id: string;
  node_type: NodeType;
  parent_node_id: string | null;
  parent_node_type: NodeType | null;
  user_id: string;
}