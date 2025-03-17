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
    this.utilityServiceUrl = process.env.UTILITY_SERVICE_URL;
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
    
    console.log(`Calling utility-service API for utility: ${utility_id} with parameters:`, parameters);
    
    try {
      // Call the utility service API
      const response = await axios.post(`${this.utilityServiceUrl}/utility`, {
        operation: utility_id,
        input: parameters || {}
      });
      
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
      
      throw new Error('Invalid response from utility service');
    } catch (error) {
      console.error(`Error calling utility ${utility_id}:`, error);
      
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
      return `I encountered an error while calling the utility: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
} 