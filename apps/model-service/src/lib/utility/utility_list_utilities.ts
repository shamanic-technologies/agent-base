/**
 * Utility List Utilities
 * 
 * A tool that calls the utility service API to list all available utility functions.
 * This provides an agent with the ability to discover what utilities are available.
 */

import { Tool } from "@langchain/core/tools";
import { z } from "zod";
import axios from 'axios';
import { NodeId, NodeType, ParentNodeId, ParentNodeType, ThreadId } from "../../types/agent-config.js";

/**
 * A utility that lists all available utilities from the utility service
 */
export class UtilityListUtilities extends Tool {
  name = "utility_list_utilities";
  description = `
    Use this tool to get a list of all available utility functions.
    This is useful when you need to know what utilities are available to you.
    The response will include the IDs of all available utilities.
    No input is required for this tool.
  `;
  
  // Store conversation and node information
  conversationId: ThreadId;
  nodeId = this.name as NodeId;
  nodeType = NodeType.UTILITY;
  parentNodeId: ParentNodeId;
  parentNodeType: ParentNodeType;
  
  // Define the input schema for the utility
  utilitySchema = z.object({}).describe(
    "No input parameters required"
  );

  // Tool configuration options for LangGraph
  configurable: { thread_id: string };
  
  // Tool metadata properties
  toolMetadata: {
    node_id: NodeId;
    node_type: NodeType;
    parent_node_id: ParentNodeId;
    parent_node_type: ParentNodeType;
  };
  
  // Utility service URL from environment variables
  private utilityServiceUrl: string;
  
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
    
    // Get the utility service URL from environment variables
    this.utilityServiceUrl = process.env.UTILITY_SERVICE_URL || 'http://localhost:3008';
  }
  
  // Method to get metadata
  getMetadata() {
    return this.toolMetadata;
  }
  
  // Override the schema method to provide a valid Zod schema
  getSchema() {
    return this.utilitySchema;
  }
  
  // Implementation that calls the utility service API
  async _call(_input: string): Promise<string> {
    console.log(`Calling utility-service API to list available utilities`);
    
    try {
      // Call the utility service API to list utilities
      const response = await axios.get(`${this.utilityServiceUrl}/utilities`);
      
      if (response.data && response.data.utilities) {
        const utilities = response.data.utilities;
        
        if (utilities.length === 0) {
          return 'No utilities are currently available.';
        }
        
        return `Available utilities: ${utilities.join(', ')}`;
      }
      
      throw new Error('Invalid response from utility service');
    } catch (error) {
      console.error("Error listing utilities:", error);
      
      if (axios.isAxiosError(error)) {
        // Handle network errors or API errors
        if (!error.response) {
          return `Network error: Failed to connect to utility service at ${this.utilityServiceUrl}`;
        }
        
        return `Utility service error: ${error.response.status} - ${error.response.data?.error || error.message}`;
      }
      
      // Generic error
      return `I encountered an error while listing utilities: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
} 