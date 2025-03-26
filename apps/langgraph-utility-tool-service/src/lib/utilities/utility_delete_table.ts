/**
 * Delete Table Utility Tool
 * 
 * Deletes an existing table from the database.
 * This is a HelloWorld implementation for demonstration purposes.
 */

import { Tool } from "@langchain/core/tools";
import { z } from "zod";
import { NodeId, NodeType, ParentNodeId, ParentNodeType, ThreadId } from "../../types/index.js";

/**
 * A utility tool that deletes a database table
 */
export class UtilityDeleteTable extends Tool {
  name = "utility_delete_table";
  description = `
    Delete an existing table from the user's dedicated database.
    
    Parameters:
    - table_id: The ID of the table to delete
    
    WARNING: This operation is irreversible. The table and all its data will be permanently deleted.
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
    table_id: z.string().describe("The ID of the table to delete")
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
  }: {
    conversationId: ThreadId;
    parentNodeId: ParentNodeId;
    parentNodeType: ParentNodeType;
    userId: string;
  }) {
    super();
    this.conversationId = conversationId;
    this.parentNodeId = parentNodeId;
    this.parentNodeType = parentNodeType;
    this.userId = userId;
    
    this.toolMetadata = {
      node_id: this.nodeId,
      node_type: this.nodeType,
      parent_node_id: this.parentNodeId,
      parent_node_type: this.parentNodeType,
      user_id: this.userId
    };
    
    this.configurable = {
      thread_id: this.conversationId
    };
  }

  getMetadata() {
    return this.toolMetadata;
  }
  
  getSchema() {
    return this.utilitySchema;
  }

  async _call(input: string | { table_id: string }): Promise<string> {
    // Parse input if it's a string
    const params = typeof input === 'string' ? JSON.parse(input) : input;
    
    // Extract parameters
    const { table_id } = params;
    // Use the user ID from constructor - it's now required
    const userId = this.userId;
    
    if (!userId) {
      throw new Error("User ID is required to delete a table");
    }
    
    // Mock table deletion response
    const mockResponse = {
      status: "success",
      message: "Table deleted successfully",
      deleted_table: {
        id: table_id,
        user_id: userId,
        deleted_at: new Date().toISOString()
      }
    };
    
    // Return formatted response
    return JSON.stringify(mockResponse, null, 2);
  }
} 