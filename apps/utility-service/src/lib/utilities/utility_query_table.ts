/**
 * Query Table Utility Tool
 * 
 * Executes a query against a specific table in the database.
 * This is a HelloWorld implementation for demonstration purposes.
 */

import { Tool } from "@langchain/core/tools";
import { z } from "zod";
import { NodeId, NodeType, ParentNodeId, ParentNodeType, ThreadId } from "../../types/index.js";

/**
 * A utility tool that queries a database table
 */
export class UtilityQueryTable extends Tool {
  name = "utility_query_table";
  description = `
    Use this tool to query a specific table in the database.
    
    Parameters:
    - table_id: The ID of the table to query
    - query: The query to execute (can be a simplified SQL-like query or a query object)
  `;
  
  // Store conversation and node information
  conversationId: ThreadId;
  nodeId = this.name as NodeId;
  nodeType = NodeType.UTILITY;
  parentNodeId: ParentNodeId;
  parentNodeType: ParentNodeType;
  
  // Define the input schema for the utility
  utilitySchema = z.object({
    table_id: z.string().describe("The ID of the table to query"),
    query: z.string().or(z.record(z.any())).describe("The query to execute (string or object)")
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

  async _call(input: string | { table_id: string; query: string | Record<string, any> }): Promise<string> {
    // Parse input if it's a string
    const params = typeof input === 'string' ? JSON.parse(input) : input;
    
    // Extract parameters
    const { table_id, query } = params;
    
    // Generate some mock results based on the table_id
    let mockResults;
    
    if (table_id === "table_001") {
      // Mock user data
      mockResults = [
        { id: "user1", name: "John Doe", email: "john@example.com", created_at: "2023-01-20T08:00:00.000Z" },
        { id: "user2", name: "Jane Smith", email: "jane@example.com", created_at: "2023-02-15T14:30:00.000Z" },
        { id: "user3", name: "Bob Johnson", email: "bob@example.com", created_at: "2023-03-10T11:45:00.000Z" }
      ];
    } else if (table_id === "table_002") {
      // Mock product data
      mockResults = [
        { id: "prod1", name: "Laptop", price: 1299.99, category: "Electronics", in_stock: true },
        { id: "prod2", name: "Headphones", price: 249.99, category: "Electronics", in_stock: true },
        { id: "prod3", name: "Desk Chair", price: 199.99, category: "Furniture", in_stock: false }
      ];
    } else {
      // Generic data for other tables
      mockResults = [
        { id: "item1", name: "Item 1", value: 100 },
        { id: "item2", name: "Item 2", value: 200 },
        { id: "item3", name: "Item 3", value: 300 }
      ];
    }
    
    // Mock query execution response
    const mockResponse = {
      status: "success",
      message: "Query executed successfully",
      query_details: {
        table_id,
        query: typeof query === 'string' ? query : JSON.stringify(query)
      },
      results: mockResults,
      metadata: {
        total_rows: mockResults.length,
        execution_time_ms: Math.floor(Math.random() * 100) + 50, // Random execution time between 50-150ms
        timestamp: new Date().toISOString()
      }
    };
    
    // Return formatted response
    return JSON.stringify(mockResponse, null, 2);
  }
} 