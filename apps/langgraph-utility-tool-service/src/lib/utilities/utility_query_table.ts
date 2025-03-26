/**
 * Query Table Utility Tool
 * 
 * Executes queries against tables in the database.
 * This is a HelloWorld implementation for demonstration purposes.
 */

import { Tool } from "@langchain/core/tools";
import { z } from "zod";
import { NodeId, NodeType, ParentNodeId, ParentNodeType, ThreadId, UtilityToolParams } from "../../types/index.js";

/**
 * A utility tool that queries database tables
 */
export class UtilityQueryTable extends Tool {
  name = "utility_query_table";
  description = `
    Execute queries against tables in the user's dedicated database.
    
    Parameters:
    - table_id: The ID of the table to query
    - query: The SQL query to execute
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
    table_id: z.string().describe("The ID of the table to query"),
    query: z.string().describe("The SQL query to execute")
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

  async _call(input: string | { table_id: string, query: string }): Promise<string> {
    // Parse input if it's a string
    const params = typeof input === 'string' ? JSON.parse(input) : input;
    
    // Extract parameters
    const { table_id, query } = params;
    // Use the user ID from constructor - it's now required
    const userId = this.userId;
    
    if (!userId) {
      throw new Error("User ID is required to query a table");
    }
    
    // Simulate query execution result
    // In a real implementation, this would execute the query against the database
    const mockQueryResult = {
      query_id: `query_${Date.now()}`,
      user_id: userId,
      table_id: table_id,
      query: query,
      executed_at: new Date().toISOString(),
      execution_time_ms: 125,
      rows_affected: 3,
      results: [
        { id: "123", name: "Product A", price: 29.99, category: "Electronics", in_stock: true },
        { id: "124", name: "Product B", price: 19.99, category: "Home", in_stock: false },
        { id: "125", name: "Product C", price: 49.99, category: "Electronics", in_stock: true }
      ]
    };
    
    // Return formatted response
    return JSON.stringify(mockQueryResult, null, 2);
  }
} 