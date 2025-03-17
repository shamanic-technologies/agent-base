/**
 * Alter Table Utility Tool
 * 
 * Alters an existing table in the database, updating its name, description, and/or schema.
 * This is a HelloWorld implementation for demonstration purposes.
 */

import { Tool } from "@langchain/core/tools";
import { z } from "zod";
import { NodeId, NodeType, ParentNodeId, ParentNodeType, ThreadId } from "../../types/index.js";

/**
 * A utility tool that alters a database table
 */
export class UtilityAlterTable extends Tool {
  name = "utility_alter_table";
  description = `
    Use this tool to alter an existing table in the database.
    
    Parameters:
    - table_id: The ID of the table to alter
    - new_name: (Optional) The new name for the table
    - new_description: (Optional) The new description for the table
    - new_schema: (Optional) The new schema definition for the table
    
    Note: You must provide at least one of new_name, new_description, or new_schema.
  `;
  
  // Store conversation and node information
  conversationId: ThreadId;
  nodeId = this.name as NodeId;
  nodeType = NodeType.UTILITY;
  parentNodeId: ParentNodeId;
  parentNodeType: ParentNodeType;
  userId?: string;
  
  // Define the input schema for the utility
  utilitySchema = z.object({
    table_id: z.string().describe("The ID of the table to alter"),
    new_name: z.string().optional().describe("The new name for the table"),
    new_description: z.string().optional().describe("The new description for the table"),
    new_schema: z.record(z.string()).optional().describe("The new schema definition for the table")
  });

  // Tool configuration options for LangGraph
  configurable: { thread_id: string };
  
  // Tool metadata properties
  toolMetadata: {
    node_id: NodeId;
    node_type: NodeType;
    parent_node_id: ParentNodeId;
    parent_node_type: ParentNodeType;
    user_id?: string;
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
    userId?: string;
  }) {
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

  async _call(input: string | { 
    table_id: string; 
    new_name?: string; 
    new_description?: string; 
    new_schema?: Record<string, string>
  }): Promise<string> {
    // Parse input if it's a string
    const params = typeof input === 'string' ? JSON.parse(input) : input;
    
    // Extract parameters
    const { table_id, new_name, new_description, new_schema } = params;
    
    // Check if at least one alteration parameter is provided
    if (!new_name && !new_description && !new_schema) {
      return JSON.stringify({
        error: "At least one of new_name, new_description, or new_schema must be provided"
      }, null, 2);
    }
    
    // Mock table alteration response
    const mockResponse = {
      status: "success",
      message: "Table altered successfully",
      table: {
        id: table_id,
        name: new_name || "Existing Name",
        description: new_description || "Existing Description",
        schema: new_schema || { id: "string", name: "string" },
        updated_at: new Date().toISOString()
      },
      changes: {
        name_changed: !!new_name,
        description_changed: !!new_description,
        schema_changed: !!new_schema
      }
    };
    
    // Return formatted response
    return JSON.stringify(mockResponse, null, 2);
  }
} 