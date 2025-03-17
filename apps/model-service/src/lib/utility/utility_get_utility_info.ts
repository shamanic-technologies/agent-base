/**
 * Utility Get Utility Info
 * 
 * A tool that calls the utility service API to get information about a specific utility.
 * This provides an agent with the ability to understand how to use a utility.
 */

import { Tool } from "@langchain/core/tools";
import { z } from "zod";
import axios from 'axios';
import { NodeId, NodeType, ParentNodeId, ParentNodeType, ThreadId } from "../../types/agent-config.js";

/**
 * A utility that gets information about a specific utility from the utility service
 */
export class UtilityGetUtilityInfo extends Tool {
  name = "utility_get_utility_info";
  description = `
    Use this tool to get detailed information about a specific utility.
    This will return the description and input schema for the utility.
    
    Required parameters:
    - utility_id: The ID of the utility you want information about (e.g., "utility_get_current_datetime")
  `;
  
  // Store conversation and node information
  conversationId: ThreadId;
  nodeId = this.name as NodeId;
  nodeType = NodeType.UTILITY;
  parentNodeId: ParentNodeId;
  parentNodeType: ParentNodeType;
  userId?: string;
  
  // Define the input schema for the utility
  // Simplified: directly expect a string which is the utility_id
  utilitySchema = z.string().describe("The ID of the utility to get information about");

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
  
  // Utility service URL from environment variables
  private utilityServiceUrl: string;
  
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
  // Simplified: directly accept the string as input
  async _call(input: string): Promise<string> {
    // The input is directly the utility_id
    const utility_id = input;
    console.log(`Calling utility-service API to get info for utility: ${utility_id}`);
    
    try {
      // Validate input
      if (!utility_id) {
        return 'Error: utility_id is required';
      }
      
      // Call the utility service API to get utility info
      const response = await axios.get(`${this.utilityServiceUrl}/utility/${utility_id}`, {
        params: {
          user_id: this.userId,
          conversation_id: this.conversationId
        }
      });
      
      if (response.data) {
        // Return raw JSON data as a string
        return JSON.stringify(response.data, null, 2);
      }
      
      throw new Error('Invalid response from utility service');
    } catch (error) {
      console.error(`Error getting info for utility ${utility_id}:`, error);
      
      if (axios.isAxiosError(error)) {
        // Handle network errors or API errors
        if (!error.response) {
          return `Network error: Failed to connect to utility service at ${this.utilityServiceUrl}`;
        }
        
        // Handle 404 separately
        if (error.response.status === 404) {
          return `Utility not found: ${utility_id}`;
        }
        
        return `Utility service error: ${error.response.status} - ${error.response.data?.error || error.message}`;
      }
      
      // Generic error
      return `I encountered an error while getting utility info: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
} 