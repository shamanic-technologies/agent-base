/**
 * Create Table Utility Tool
 * 
 * Creates a new table in the database with the specified name, description, and schema.
 * This is a HelloWorld implementation for demonstration purposes.
 */

import { Tool } from "@langchain/core/tools";
import { z } from "zod";
import { NodeId, NodeType, ParentNodeId, ParentNodeType, ThreadId } from "../../types/index.js";

/**
 * A utility tool that creates a database table
 */
export class UtilityCreateTable extends Tool {
  name = "utility_create_table";
  description = `
    Use this tool to create a new table in the database.
    
    Parameters:
    - name: The name of the table
    - description: A description of the table's purpose
    - schema: The schema definition for the table
  `;
  
  // Store conversation and node information
  conversationId: ThreadId;
  nodeId = this.name as NodeId;
  nodeType = NodeType.UTILITY;
  parentNodeId: ParentNodeId;
  parentNodeType: ParentNodeType;
  
  // Define the input schema for the utility
  utilitySchema = z.object({
    name: z.string().describe("The name of the table to create"),
    description: z.string().describe("A description of the table's purpose"),
    schema: z.record(z.string()).describe("The schema definition for the table as a key-value object")
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

  async _call(input: string | { name: string; description: string; schema: Record<string, string> }): Promise<string> {
    // Parse input if it's a string
    const params = typeof input === 'string' ? JSON.parse(input) : input;
    
    // Extract parameters
    const { name, description, schema } = params;
    
    // Generate a mock table ID
    const tableId = `table_${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    
    // Mock table creation response
    const mockResponse = {
      status: "success",
      message: "Table created successfully",
      table: {
        id: tableId,
        name,
        description,
        schema,
        created_at: new Date().toISOString()
      }
    };
    
    // Return formatted response
    return JSON.stringify(mockResponse, null, 2);
  }
} 