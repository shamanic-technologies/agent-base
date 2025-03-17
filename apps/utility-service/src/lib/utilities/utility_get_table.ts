/**
 * Get Table Utility Tool
 * 
 * Retrieves information about a specific table from the database.
 * This is a HelloWorld implementation for demonstration purposes.
 */

import { Tool } from "@langchain/core/tools";
import { z } from "zod";
import { NodeId, NodeType, ParentNodeId, ParentNodeType, ThreadId } from "../../types/index.js";

/**
 * A utility tool that gets table information
 */
export class UtilityGetTable extends Tool {
  name = "utility_get_table";
  description = `
    Use this tool to get information about a specific table in the database.
    
    Parameters:
    - table_id: The ID of the table to retrieve
  `;
  
  // Store conversation and node information
  conversationId: ThreadId;
  nodeId = this.name as NodeId;
  nodeType = NodeType.UTILITY;
  parentNodeId: ParentNodeId;
  parentNodeType: ParentNodeType;
  
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
  };

  constructor({ 
    conversationId,
    parentNodeId,
    parentNodeType
  }: {
    conversationId: ThreadId;
    parentNodeId: ParentNodeId;
    parentNodeType: ParentNodeType;
  }) {
    super();
    this.conversationId = conversationId;
    this.parentNodeId = parentNodeId;
    this.parentNodeType = parentNodeType;
    
    this.toolMetadata = {
      node_id: this.nodeId,
      node_type: this.nodeType,
      parent_node_id: this.parentNodeId,
      parent_node_type: this.parentNodeType
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
    
    // Mock table retrieval response based on table_id
    let mockTableResponse;
    
    if (table_id === "table_001") {
      mockTableResponse = {
        id: "table_001",
        name: "users",
        description: "Contains user information",
        schema: {
          id: "string",
          name: "string",
          email: "string",
          created_at: "datetime"
        },
        created_at: "2023-01-15T08:30:00.000Z",
        updated_at: "2023-03-22T14:15:00.000Z"
      };
    } else if (table_id === "table_002") {
      mockTableResponse = {
        id: "table_002",
        name: "products",
        description: "Product catalog",
        schema: {
          id: "string",
          name: "string",
          price: "number",
          category: "string",
          in_stock: "boolean"
        },
        created_at: "2023-02-01T10:45:00.000Z",
        updated_at: "2023-04-10T16:20:00.000Z"
      };
    } else {
      // Generic table response for other IDs
      mockTableResponse = {
        id: table_id,
        name: "Sample Table",
        description: "Sample table description",
        schema: {
          id: "string",
          name: "string",
          value: "number"
        },
        created_at: "2023-05-01T09:00:00.000Z",
        updated_at: "2023-05-01T09:00:00.000Z"
      };
    }
    
    // Return formatted response
    return JSON.stringify({
      status: "success",
      table: mockTableResponse
    }, null, 2);
  }
} 