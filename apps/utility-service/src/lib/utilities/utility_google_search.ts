/**
 * Google Search Utility
 * 
 * A tool that performs web searches using the Google Search API and returns formatted results.
 * This utility is useful for finding up-to-date information from the web.
 */

import { Tool } from "@langchain/core/tools";
import { z } from "zod";
import { NodeId, NodeType, ParentNodeId, ParentNodeType, ThreadId } from "../../types/index.js";

/**
 * A Google Search utility that provides search results from the web
 */
export class UtilityGoogleSearch extends Tool {
  name = "utility_google_search";
  description = `
    Use this tool to search the web using Google Search API.
    Provide a search query and get back the top search results.
    
    The results include:
    - Title of the webpage
    - URL link
    - Short snippet/description
    
    Example queries:
    - "online therapy platforms"
    - "mental health support statistics 2024"
    - "best practices for online counseling"
    
    The tool returns formatted search results with titles, links and snippets.
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
    query: z.string().describe("The search query to perform")
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
  
  // Method to get metadata (instead of overriding the property)
  getMetadata() {
    return this.toolMetadata;
  }
  
  // Override the schema method to provide a valid Zod schema
  getSchema() {
    return this.utilitySchema;
  }
  
  async _call(input: string | { query: string; limit?: number }): Promise<string> {
    try {
      // Parse input - handle both string and object formats
      let query: string;
      let limit = 5; // Default limit
      
      if (typeof input === 'string') {
        // If it's a string, use it directly as the query
        query = input.trim();
      } else if (input && typeof input === 'object' && 'query' in input) {
        // If it's an object with query and limit properties
        query = input.query.trim();
        if (input.limit !== undefined) {
          limit = Math.min(Math.max(1, input.limit), 10); // Ensure limit is between 1 and 10
        }
      } else {
        throw new Error("Invalid input: Search query is required");
      }
      
      // Validate query
      if (!query) {
        throw new Error("Search query cannot be empty");
      }
      
      console.log(`Performing Google search for query: "${query}" (limit: ${limit})`);
      
      // Use SerpAPI to perform the search
      const response = await fetch(`https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${process.env.SERPAPI_API_KEY || ''}`);
      
      if (!response.ok) {
        throw new Error(`Google Search request failed with status ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.organic_results || data.organic_results.length === 0) {
        return "No search results found for your query.";
      }

      // Format the search results
      const formattedResults = data.organic_results
        .slice(0, limit) // Limit to specified number of results
        .map((result: any, index: number) => `
Result ${index + 1}:
Title: ${result.title || 'No title'}
Link: ${result.link || 'No link'}
Snippet: ${result.snippet || 'No snippet available'}
-------------------`
        ).join('\n');

      return `Search results for "${query}":\n${formattedResults}`;
      
    } catch (error) {
      console.error("Google Search utility error:", error);
      return `I encountered an error while searching: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
} 