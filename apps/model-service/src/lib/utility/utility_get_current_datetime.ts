/**
 * DateTime Utility Tool
 * 
 * A tool that returns the current date and time in various formats based on the request.
 * This tool demonstrates an implementation with schema validation and proper metadata configuration.
 */

import { Tool } from "@langchain/core/tools";
import { z } from "zod";
import { NodeId, NodeType, ParentNodeId, ParentNodeType, ThreadId } from "../../types/agent-config";


/**
 * A DateTime utility tool that provides the current date and time in various formats
 */
export class UtilityGetCurrentDateTime extends Tool {
  name = "utility_get_current_datetime";
  description = `
    Use this tool to get the current date and time.
    
    You can request different formats:
    - 'iso' (default): ISO 8601 format (e.g., '2023-12-31T08:00:00.000Z')
    - 'locale': Human-readable format (e.g., 'December 31, 2023, 08:00:00 AM')
    - 'date': Date only (e.g., 'December 31, 2023')
    - 'time': Time only (e.g., '08:00:00 AM')
    - 'unix': Unix timestamp (seconds since epoch)
  `;
  
  // Store conversation and node information
  conversationId: ThreadId;
  nodeId = this.name as NodeId;
  nodeType = NodeType.UTILITY;
  parentNodeId: ParentNodeId;
  parentNodeType: ParentNodeType;
  
  // Define the input schema for the utility
  utilitySchema = z.object({
    format: z.string().optional().describe(
      "Optional format for the datetime: 'iso' (default), 'locale', 'date', 'time', or 'unix'"
    )
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
  }) {
    super();
    
    // Initialize conversation info
    this.conversationId = conversationId;
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
  }
  
  // Method to get metadata (instead of overriding the property)
  getMetadata() {
    return this.toolMetadata;
  }
  
  // Override the schema method to provide a valid Zod schema
  getSchema() {
    return this.utilitySchema;
  }
  
  async _call(input: string | { format?: string }): Promise<string> {
    console.log(`Getting datetime with format:`, input);
    
    try {
      // Parse input - handle both string and object formats
      let format: string;
      
      if (typeof input === 'string') {
        // If it's a string, use it directly as the format
        format = input?.trim() || 'iso';
      } else if (input && typeof input === 'object' && 'format' in input) {
        // If it's an object with a format property, use that
        format = input.format?.trim() || 'iso';
      } else {
        // Default to ISO
        format = 'iso';
      }
      
      const now = new Date();
      
      // Different format options
      switch (format.toLowerCase()) {
        case 'iso':
          return now.toISOString();
        
        case 'locale':
          return now.toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          });
        
        case 'date':
          return now.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        
        case 'time':
          return now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          });
          
        case 'unix':
          return Math.floor(now.getTime() / 1000).toString();
          
        default:
          return now.toISOString();
      }
    } catch (error) {
      console.error("DateTime utility error:", error);
      return `I encountered an error while getting the datetime: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
} 