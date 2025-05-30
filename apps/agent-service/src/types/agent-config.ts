/**
 * Agent Configuration Types
 * 
 * Type definitions for the Claude 3.7 Sonnet agent implementation.
 * Contains essential type information for the AI service.
 */

/**
 * Claude model names
 * Available Claude model identifiers
 */
export enum ModelName {
  CLAUDE_3_7_SONNET_20250219 = 'claude-3-7-sonnet-20250219'
}

// /**
//  * Basic conversation types
//  * Used for tracking conversations and requests
//  */
// export type ConversationId = string;

// /**
//  * User information types
//  * Used for authentication and request tracking
//  */
// export type UserId = string;

// /**
//  * Node types for utility tools
//  * Defines the different types of nodes in the agent system
//  */
// export enum NodeType {
//   AGENT = "agent",
//   TOOL = "tool",
//   UTILITY = "utility"
// }

// /**
//  * Node ID type (string alias for tool identification)
//  */
// export type NodeId = string;

// /**
//  * Parent Node ID type (string or null for top-level nodes)
//  */
// export type ParentNodeId = string | null;

// /**
//  * Parent Node Type (NodeType or null for top-level nodes)
//  */
// export type ParentNodeType = NodeType | null;

// /**
//  * Thread ID type (string alias for conversation tracking)
//  */
// export type ThreadId = string;

// /**
//  * Metadata for tool usage
//  * Used to track tool invocations within the agent system
//  */
// export interface ToolMetadata {
//   nodeId: string;
//   nodeType: NodeType;
//   parentNodeId: string | null;
//   parentNodeType: NodeType | null;
//   userId: string;
// }