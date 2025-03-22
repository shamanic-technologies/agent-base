/**
 * Utility Call Utility
 * 
 * A tool that calls a specific utility in the utility service with parameters.
 * This allows the agent to use any registered utility function.
 */

import { Tool } from "@langchain/core/tools";
import { z } from "zod";
import axios from 'axios';
import { NodeId, NodeType, ParentNodeId, ParentNodeType, ThreadId } from "../../types/agent-config.js";

/**
 * A utility that calls a utility in the utility service with parameters
 */
export class UtilityCallUtility extends Tool {
  name = "utility_call_utility";
  description = `
    Use this tool to call a specific utility with parameters.
    
    Required parameters:
    - utility_id: The ID of the utility to call (e.g., "utility_get_current_datetime")
    - parameters: An object containing the parameters to pass to the utility (depends on the utility)
    
    Example formats accepted:
    
    1. utility_get_current_datetime
    {
      "utility_id": "utility_get_current_datetime",
      "parameters": {
        "format": "iso"
      }
    }
    
    2. utility_google_search:
    {
      "utility_id": "utility_google_search",
      "parameters": {
        "query": "latest news"
      }
    }
    
    3. utility_firecrawl_extract_content:
    {
      "utility_id": "utility_firecrawl_extract_content",
      "parameters": {
        "url": "https://example.com"
      }
    }
    
    You can use the utility_list_utilities tool to see available utilities,
    and the utility_get_utility_info tool to learn about a specific utility's parameters.
  `;
  
  // Store conversation and node information
  conversationId: ThreadId;
  nodeId = this.name as NodeId;
  nodeType = NodeType.UTILITY;
  parentNodeId: ParentNodeId;
  parentNodeType: ParentNodeType;
  userId: string;
  
  // Define the input schema for the utility
  // Expect a JSON string containing utility_id and parameters
  utilitySchema = z.string().describe("JSON string with utility_id and parameters");

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
  async _call(input: string): Promise<string> {
    let utility_id: string | undefined;
    let parameters: Record<string, any> = {};
    
    try {
      // Parse the input JSON string 
      let parsedInput: any;
      
      try {
        parsedInput = JSON.parse(input);
      } catch (parseError) {
        console.error("Failed to parse input JSON:", parseError);
        return `Error parsing input: Invalid JSON format. Expected format: {"utility_id": "utility_name", "parameters": {...}}`;
      }
      
      // Handle case where LLM wraps everything in an "input" property
      if (parsedInput.input && typeof parsedInput.input === 'string') {
        try {
          // Try to parse the nested input string
          const nestedInput = JSON.parse(parsedInput.input);
          
          // If successful, use this as our input
          parsedInput = nestedInput;
          console.log("Successfully parsed nested input structure");
        } catch (nestedParseError) {
          console.log("Input has 'input' property but it's not valid JSON, using as is");
        }
      }
      
      // Extract utility_id and parameters
      utility_id = parsedInput.utility_id;
      parameters = parsedInput.parameters || {};
      
      // Check if we have valid data
      if (!utility_id) {
        return 'Error: utility_id is required. Expected format: {"utility_id": "utility_name", "parameters": {...}}';
      }
    } catch (e) {
      console.error("Error processing input:", e);
      return `Error: Invalid input format. Expected JSON format: {"utility_id": "utility_name", "parameters": {...}}`;
    }
    
    console.log(`Calling API Gateway for utility: ${utility_id} with parameters:`, parameters);
    
    try {
      // Set up headers with X-API-KEY authentication
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (!this.apiKey) {
        console.error('No API key provided when calling utility_call_utility');
        throw new Error('Authentication required: API key is missing');
      }
      
      // Use X-API-KEY header instead of Authorization
      headers['x-api-key'] = this.apiKey;
      
      // Call the API Gateway to forward to the utility service
      const response = await axios.post(`${this.apiGatewayUrl}/utility/utility`, {
        operation: utility_id,
        input: parameters,
        user_id: this.userId,
        conversation_id: this.conversationId
      }, { headers });
      
      if (response.data) {
        // If there's an error, throw it
        if (response.data.error) {
          throw new Error(response.data.error);
        }
        
        // Format the response data as a string
        if (typeof response.data.data === 'string') {
          return response.data.data;
        } else if (response.data.data !== undefined) {
          return JSON.stringify(response.data.data, null, 2);
        }
        
        return JSON.stringify(response.data, null, 2);
      }
      
      throw new Error('Invalid response from API Gateway');
    } catch (error) {
      console.error(`Error calling utility ${utility_id}:`, error);
      
      if (axios.isAxiosError(error)) {
        // Handle network errors or API errors
        if (!error.response) {
          return `Network error: Failed to connect to API Gateway at ${this.apiGatewayUrl}`;
        }
        
        // Handle 404 separately
        if (error.response.status === 404) {
          return `Utility not found: ${utility_id}`;
        }
        
        return `API Gateway error: ${error.response.status} - ${error.response.data?.error || error.message}`;
      }
      
      // Generic error
      return `I encountered an error while calling the utility: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
} 