/**
 * Database Information Utility Tool
 * 
 * Returns database information including name, table info (ids, name, description, schema)
 * Uses Xata to manage databases for users.
 */

import { Tool } from "@langchain/core/tools";
import { z } from "zod";
import { NodeId, NodeType, ParentNodeId, ParentNodeType, ThreadId, UtilityToolParams } from "../../types/index.js";
import { getUserDatabase } from "../utils/database-utils.js";

/**
 * A utility tool that provides database information and manages Xata databases
 */
export class UtilityGetDatabase extends Tool {
  name = "utility_get_database";
  description = `
    Get information about the user's dedicated database.
    
    Returns database information including:
    - Database name
    - Table information (IDs, names, descriptions, schemas)
  `;
  
  // Store conversation and node information
  conversationId: ThreadId;
  nodeId = this.name as NodeId;
  nodeType = NodeType.UTILITY;
  parentNodeId: ParentNodeId;
  parentNodeType: ParentNodeType;
  userId: string;
  
  // Define the input schema for the utility
  utilitySchema = z.object({
    // No parameters needed - user_id is already available from constructor
  });

  // Tool configuration options for LangGraph
  configurable: { thread_id: string };
  
  // Tool metadata properties
  toolMetadata: {
    node_id: NodeId;
    node_type: NodeType;
    parent_node_id: ParentNodeId;
    parent_node_type: ParentNodeType;
    user_id: string;
  };

  constructor({ 
    conversationId,
    parentNodeId,
    parentNodeType,
    userId
  }: UtilityToolParams) {
    super();
    
    // Initialize conversation info
    this.conversationId = conversationId;
    this.parentNodeId = parentNodeId;
    this.parentNodeType = parentNodeType;
    this.userId = userId;
    
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
      user_id: this.userId
    };
  }

  getMetadata() {
    return this.toolMetadata;
  }
  
  getSchema() {
    return this.utilitySchema;
  }

  async _call(input: string | object): Promise<string> {
    try {
      // Use the user_id from the constructor - it's now required
      const userId = this.userId;
      
      // Use the extracted getUserDatabase function to handle all the database operations
      const databaseInfo = await getUserDatabase(userId);
      
      // Return formatted response
      return JSON.stringify(databaseInfo, null, 2);
    } catch (error) {
      console.error("Error in utility_get_database:", error);
      return JSON.stringify({
        error: "Failed to get database information",
        details: error instanceof Error ? error.message : String(error)
      }, null, 2);
    }
  }
} 