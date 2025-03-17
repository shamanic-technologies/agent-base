/**
 * Get Table Utility Tool
 * 
 * Retrieves information about a specific table from the database.
 * This is a HelloWorld implementation for demonstration purposes.
 */

import { Tool } from "@langchain/core/tools";
import { z } from "zod";
import { NodeId, NodeType, ParentNodeId, ParentNodeType, ThreadId, UtilityToolParams } from "../../types/index.js";

/**
 * A utility tool that gets table information
 */
export class UtilityGetTable extends Tool {
  name = "utility_get_table";
  description = `
    Get information about a specific table in the user's dedicated database.
    
    Parameters:
    - table_id: The ID of the table to retrieve
    - user_id: The user ID for authorization and tracking
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
    table_id: z.string().describe("The ID of the table to retrieve")
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
    
    // Mock table information response
    const mockTableInfo = {
      id: table_id,
      user_id: userId,
      name: "Products Table",
      description: "Contains product catalog information",
      created_at: "2023-05-20T15:30:00Z",
      schema: {
        id: "uuid",
        name: "text",
        description: "text",
        price: "decimal",
        category: "text",
        in_stock: "boolean",
        created_at: "timestamp",
        updated_at: "timestamp"
      },
      row_count: 250,
      size_bytes: 128000
    };
    
    // Return formatted response
    return JSON.stringify(mockTableInfo, null, 2);
  }
} 