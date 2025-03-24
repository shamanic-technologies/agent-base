/**
 * Google Maps Utility
 * 
 * A tool that performs location-based searches using the Google Maps API via SerpAPI and returns formatted results.
 * This utility is useful for finding places, businesses, and detailed location information.
 */

import { Tool } from "@langchain/core/tools";
import { z } from "zod";
import { NodeId, NodeType, ParentNodeId, ParentNodeType, ThreadId } from "../../types/index.js";

/**
 * A Google Maps utility that provides location-based search results
 */
export class UtilityGoogleMaps extends Tool {
  name = "utility_google_maps";
  description = `
    Use this tool to search for locations, businesses, and places using Google Maps via SerpAPI.
    Provide a search query and optional location to get back relevant place results.
    
    The results include:
    - Name of the place/business
    - Address information
    - Rating and number of reviews
    - Price level (if applicable)
    - Business type and categories
    - Open status and operating hours
    - Phone number and website (when available)
    
    Example queries:
    - "pizza in New York"
    - "coffee shops near Times Square"
    - "parks in San Francisco"
    - "museums in London"
    
    The tool returns formatted place results with details about each location.
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
    query: z.string().describe("The search query for places/locations"),
    location: z.string().optional().describe("Optional specific location to search in (e.g., 'New York, NY')"),
    limit: z.number().optional().describe("Maximum number of results to return (1-10)")
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
  
  async _call(input: string | { query: string; location?: string; limit?: number }): Promise<string> {
    try {
      // Parse input - handle both string and object formats
      let query: string;
      let location: string | undefined;
      let limit = 5; // Default limit
      
      if (typeof input === 'string') {
        // If it's a string, use it directly as the query
        query = input.trim();
      } else if (input && typeof input === 'object' && 'query' in input) {
        // If it's an object with query, location and limit properties
        query = input.query.trim();
        location = input.location?.trim();
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
      
      console.log(`Performing Google Maps search for query: "${query}"${location ? ` in ${location}` : ''} (limit: ${limit})`);
      
      // Build the API URL
      let apiUrl = `https://serpapi.com/search.json?engine=google_maps&q=${encodeURIComponent(query)}&api_key=${process.env.SERPAPI_API_KEY || ''}`;
      
      // Add location parameter if provided
      if (location) {
        apiUrl += `&location=${encodeURIComponent(location)}`;
      }
      
      // Use SerpAPI to perform the search
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`Google Maps search request failed with status ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.local_results && !data.place_results) {
        return "No place results found for your query.";
      }

      // Format the search results
      let formattedResults = "";
      
      // Handle place_results (single place detail)
      if (data.place_results) {
        const place = data.place_results;
        formattedResults = `
Place Details:
Name: ${place.title || 'No name'}
Address: ${place.address || 'No address'}
${place.rating ? `Rating: ${place.rating}/5 (${place.reviews || 0} reviews)` : 'No ratings'}
${place.type ? `Type: ${place.type}` : ''}
${place.price ? `Price: ${place.price}` : ''}
${place.open_state ? `Status: ${place.open_state}` : place.opens_date ? `Status: ${place.opens_date}` : ''}
${place.phone ? `Phone: ${place.phone}` : ''}
${place.website ? `Website: ${place.website}` : ''}
${place.description ? `Description: ${place.description}` : ''}`;
      } 
      // Handle local_results (multiple places)
      else if (data.local_results && data.local_results.length > 0) {
        formattedResults = data.local_results
          .slice(0, limit)
          .map((place: any, index: number) => `
Place ${index + 1}:
Name: ${place.title || 'No name'}
Address: ${place.address || 'No address'}
${place.rating ? `Rating: ${place.rating}/5 (${place.reviews || 0} reviews)` : 'No ratings'}
${place.type ? `Type: ${place.type}` : ''}
${place.price ? `Price: ${place.price}` : ''}
${place.open_state ? `Status: ${place.open_state}` : place.opens_date ? `Status: ${place.opens_date}` : ''}
${place.phone ? `Phone: ${place.phone}` : ''}
${place.website ? `Website: ${place.website}` : ''}
${place.description ? `Description: ${place.description}` : ''}
-------------------`
          ).join('\n');
      }

      return `Places found for "${query}"${location ? ` in ${location}` : ''}:\n${formattedResults}`;
      
    } catch (error) {
      console.error("Google Maps utility error:", error);
      return `I encountered an error while searching for places: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
} 