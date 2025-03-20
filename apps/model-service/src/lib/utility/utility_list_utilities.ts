/**
 * Utility List Utilities
 * 
 * A tool that calls the API gateway to list all available utility functions.
 * This provides an agent with the ability to discover what utilities are available.
 */

import { Tool } from "@langchain/core/tools";
import { z } from "zod";
import axios from 'axios';
import { NodeId, NodeType, ParentNodeId, ParentNodeType, ThreadId } from "../../types/agent-config.js";

/**
 * A utility that lists all available utilities through the API gateway
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
  userId?: string;
  
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
    user_id: string;
  };
  
  // API Gateway URL from environment variables
  private apiGatewayUrl: string;
  
  // API key for authentication
  private apiKey?: string;
  
  constructor({ 
    conversationId,
    parentNodeId,
    parentNodeType,
    userId,
    apiKey
  }: {
    conversationId: ThreadId;
    parentNodeId: ParentNodeId;
    parentNodeType: ParentNodeType;
    userId: string;
    apiKey?: string;
  }) {
    super();
    
    // Initialize conversation info
    this.conversationId = conversationId;
    this.parentNodeId = parentNodeId;
    this.parentNodeType = parentNodeType;
    this.userId = userId;
    this.apiKey = apiKey;
    
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
    
    // Get the API Gateway URL from environment variables
    this.apiGatewayUrl = process.env.API_GATEWAY_URL;
  }
  
  // Method to get metadata
  getMetadata() {
    return this.toolMetadata;
  }
  
  // Override the schema method to provide a valid Zod schema
  getSchema() {
    return this.utilitySchema;
  }
  
  // Implementation that calls the API Gateway to reach the utility service
  async _call(_input: string): Promise<string> {
    console.log(`Calling API Gateway to list available utilities`);
    
    try {
      // Set up headers with Bearer token authentication
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      };
      
      if (!this.apiKey) {
        console.error('No API key provided when calling utility_list_utilities');
        throw new Error('Authentication required: API key is missing');
      }
      
      // Call the API Gateway endpoint for listing utilities using GET
      // The utility service has a GET /utilities endpoint, not POST
      const response = await axios.get(`${this.apiGatewayUrl}/utility/utilities`, {
        params: {
          user_id: this.userId,
          conversation_id: this.conversationId
        },
        headers
      });
      
      if (response.data && response.data.utilities) {
        const utilities = response.data.utilities;
        
        if (utilities.length === 0) {
          return 'No utilities are currently available.';
        }
        
        return `Available utilities: ${utilities.join(', ')}`;
      }
      
      throw new Error('Invalid response from API Gateway');
    } catch (error) {
      console.error("Error listing utilities:", error);
      
      if (axios.isAxiosError(error)) {
        // Handle network errors or API errors
        if (!error.response) {
          return `Network error: Failed to connect to API Gateway at ${this.apiGatewayUrl}`;
        }
        
        return `API Gateway error: ${error.response.status} - ${error.response.data?.error || error.message}`;
      }
      
      // Generic error
      return `I encountered an error while listing utilities: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
} 