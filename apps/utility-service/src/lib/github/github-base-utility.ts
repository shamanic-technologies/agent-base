/**
 * GitHub Base Utility
 * 
 * Base class for all GitHub utilities with common functionality.
 */

import { Tool } from "@langchain/core/tools";
import { z } from "zod";
import { GitHubClient, createGitHubClientFromEnv } from "./github-client.js";
import { NodeId, NodeType, ParentNodeId, ParentNodeType, ThreadId } from "../../types/index.js";

/**
 * Base class for GitHub utilities
 */
export abstract class GitHubBaseUtility extends Tool {
  // Tool configuration
  name: string;  
  description: string;
  
  // Store conversation and node information
  conversationId: ThreadId;
  nodeId: NodeId;
  nodeType = NodeType.UTILITY;
  parentNodeId: ParentNodeId;
  parentNodeType: ParentNodeType;
  
  // GitHub client
  protected githubClient: GitHubClient;
  
  // Define the basic schema for GitHub operations - to be extended by each utility
  protected baseSchema = z.object({
    owner: z.string().optional().describe("Repository owner (username or organization)"),
    repo: z.string().optional().describe("Repository name"),
    path: z.string().optional().describe("File or directory path"),
    branch: z.string().optional().describe("Branch name (defaults to the default branch)")
  });
  
  // Tool configuration options for LangGraph
  configurable: { thread_id: string };
  
  // Tool metadata properties
  toolMetadata: {
    node_id: NodeId;
    node_type: NodeType;
    parent_node_id: ParentNodeId;
    parent_node_type: ParentNodeType;
  };
  
  constructor({ 
    name,
    description,
    conversationId,
    parentNodeId,
    parentNodeType,
    githubClient
  }: {
    name: string;
    description: string;
    conversationId: ThreadId;
    parentNodeId: ParentNodeId;
    parentNodeType: ParentNodeType;
    githubClient?: GitHubClient;
  }) {
    super();
    
    // Initialize tool info
    this.name = name;
    this.description = description;
    
    // Initialize conversation info
    this.conversationId = conversationId;
    this.nodeId = this.name as NodeId;
    this.parentNodeId = parentNodeId;
    this.parentNodeType = parentNodeType;
    
    // Set the configurable options
    this.configurable = {
      thread_id: this.conversationId
    };
    
    // Set the tool metadata
    this.toolMetadata = {
      node_id: this.nodeId,
      node_type: this.nodeType,
      parent_node_id: this.parentNodeId,
      parent_node_type: this.parentNodeType,
    };
    
    // Initialize GitHub client
    this.githubClient = githubClient || createGitHubClientFromEnv();
  }
  
  // Method to get metadata
  getMetadata() {
    return this.toolMetadata;
  }
  
  // Abstract method to get the utility schema
  abstract getSchema(): z.ZodType<any, any>;
  
  // Abstract method to implement the utility logic
  abstract _call(input: any): Promise<string>;
  
  /**
   * Helper method to parse input parameters
   */
  protected parseInput(input: string | Record<string, any>): Record<string, any> {
    // Handle string input
    if (typeof input === 'string') {
      try {
        return JSON.parse(input);
      } catch (error) {
        return {};
      }
    }
    
    // Handle object input
    return input || {};
  }
} 