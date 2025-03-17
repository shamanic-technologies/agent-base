/**
 * Database Information Utility Tool
 * 
 * Returns database information including name, table info (ids, name, description, schema)
 * This is a HelloWorld implementation for demonstration purposes.
 */

import { Tool } from "@langchain/core/tools";
import { z } from "zod";
import { NodeId, NodeType, ParentNodeId, ParentNodeType, ThreadId } from "../../types/index.js";

/**
 * A utility tool that provides database information
 */
export class UtilityGetDatabase extends Tool {
  name = "utility_get_database";
  description = `
    Use this tool to get information about the database.
    
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
  userId?: string;
  
  // Define the input schema for the utility
  utilitySchema = z.object({});

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

  async _call(_input: string | object): Promise<string> {
    // Mock database information response
    const mockDatabaseInfo = {
      database_name: "HelloWorld Database",
      tables: [
        {
          id: "table_001",
          name: "users",
          description: "Contains user information",
          schema: {
            id: "string",
            name: "string",
            email: "string",
            created_at: "datetime"
          }
        },
        {
          id: "table_002",
          name: "products",
          description: "Product catalog",
          schema: {
            id: "string",
            name: "string",
            price: "number",
            category: "string",
            in_stock: "boolean"
          }
        }
      ]
    };
    
    // Return formatted response
    return JSON.stringify(mockDatabaseInfo, null, 2);
  }
} 