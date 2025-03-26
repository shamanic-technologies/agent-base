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
  async _call(utilityId: string): Promise<string> {
    console.log(`Calling API Gateway to get information on utility: ${utilityId}`);
    
    try {
      // Validate input
      if (!utilityId) {
        return 'Error: utility_id is required';
      }
      
      // Set up headers with X-API-KEY authentication
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (!this.apiKey) {
        console.error('No API key provided when calling utility_get_utility_info');
        throw new Error('Authentication required: API key is missing');
      }
      
      // Use X-API-KEY header instead of Authorization
      headers['x-api-key'] = this.apiKey;
      
      // Call the API Gateway endpoint for getting utility information
      const response = await axios.get(`${this.apiGatewayUrl}/utility/utility/${utilityId}`, {
        params: {
          user_id: this.userId,
          conversation_id: this.conversationId
        },
        headers
      });
      
      if (response.data) {
        // Return raw JSON data as a string
        return JSON.stringify(response.data, null, 2);
      }
      
      throw new Error('Invalid response from API Gateway');
    } catch (error) {
      console.error(`Error getting info for utility ${utilityId}:`, error);
      
      if (axios.isAxiosError(error)) {
        // Handle network errors or API errors
        if (!error.response) {
          return `Network error: Failed to connect to API Gateway at ${this.apiGatewayUrl}`;
        }
        
        // Handle 404 separately
        if (error.response.status === 404) {
          return `Utility not found: ${utilityId}`;
        }
        
        return `API Gateway error: ${error.response.status} - ${error.response.data?.error || error.message}`;
      }
      
      // Generic error
      return `I encountered an error while getting utility info: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
} 