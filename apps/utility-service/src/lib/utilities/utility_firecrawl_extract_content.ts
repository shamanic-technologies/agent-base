/**
 * FireCrawl Web Content Extraction Utility
 * 
 * A tool that extracts content from web pages using the FireCrawl API and returns it in markdown format.
 * This utility is useful for fetching clean, LLM-friendly content from websites.
 */

import { Tool } from "@langchain/core/tools";
import { z } from "zod";
import { NodeId, NodeType, ParentNodeId, ParentNodeType, ThreadId } from "../../types/index.js";

/**
 * A FireCrawl web content extraction utility that provides markdown content from URLs
 */
export class UtilityFireCrawlExtractContent extends Tool {
  name = "utility_firecrawl_extract_content";
  description = `
    Use this tool to fetch content from any URL.
    Provide a URL and get back clean, LLM-ready markdown content.
    
    This tool can extract content from:
    - Regular web pages
    - Blog posts
    - Documentation pages
    - PDF documents
    
    Example URLs:
    - "https://best-online-therapists.com/about"
    - "https://www.apa.org/topics/depression"
    - "https://docs.example.com/mental-health-resources.pdf"
    
    The tool returns formatted markdown content that's ready for analysis.
  `;
  
  // Store conversation and node information
  conversationId: ThreadId;
  nodeId = this.name as NodeId;
  nodeType = NodeType.UTILITY;
  parentNodeId: ParentNodeId;
  parentNodeType: ParentNodeType;
  
  // Define the input schema for the utility
  utilitySchema = z.object({
    url: z.string().describe(
      "The URL to fetch content from. Must be a valid URL including the protocol (http:// or https://)."
    ),
    onlyMainContent: z.boolean().optional().describe(
      "Whether to extract only the main content (default: true). When true, navigational elements, headers, footers, etc. are excluded."
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
  }
  
  // Method to get metadata (instead of overriding the property)
  getMetadata() {
    return this.toolMetadata;
  }
  
  // Override the schema method to provide a valid Zod schema
  getSchema() {
    return this.utilitySchema;
  }
  
  async _call(input: string | { url: string; onlyMainContent?: boolean }): Promise<string> {
    try {
      // Parse input - handle both string and object formats
      let url: string;
      let onlyMainContent = true;
      
      if (typeof input === 'string') {
        // If it's a string, use it directly as the URL
        url = input.trim();
      } else if (input && typeof input === 'object' && 'url' in input) {
        // If it's an object with url and onlyMainContent properties
        url = input.url.trim();
        onlyMainContent = input.onlyMainContent !== false; // Default to true if not explicitly false
      } else {
        throw new Error("Invalid input: URL is required");
      }
      
      // Validate URL
      if (!url || !url.match(/^https?:\/\/.+/)) {
        throw new Error("Invalid URL format. URL must start with http:// or https://");
      }
      
      console.log(`Extracting content from URL: ${url} (onlyMainContent: ${onlyMainContent})`);
      
      // Use FireCrawl API to fetch content from the URL
      const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.FIRECRAWL_API_KEY || ''}`
        },
        body: JSON.stringify({
          url: url,
          onlyMainContent: onlyMainContent,
          formats: ["markdown"] // Get content in markdown format for LLMs
        })
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error(`FireCrawl API error: ${errorData}`);
        return `Error fetching content from URL: ${url}. Status code: ${response.status}. Please verify the URL is correct and accessible.`;
      }

      const data = await response.json();
      
      if (!data.success) {
        return `Failed to fetch content from URL: ${url}. ${data.message || 'No error message provided by the API.'}`;
      }

      // Check if data structure is as expected
      if (!data.data || !data.data.markdown) {
        console.log('Unexpected API response structure:', JSON.stringify(data));
        return `The URL was accessed but no markdown content was found. Received response structure: ${JSON.stringify(data).substring(0, 200)}...`;
      }

      // Get the markdown content from the correct path in the response
      const markdownContent = data.data.markdown;
      
      // Check if content exists
      if (!markdownContent || markdownContent.trim() === '') {
        return `URL was accessible but no content was found at ${url}. This could be because:
1. The page exists but has no meaningful content
2. The page requires JavaScript to render content (which some scrapers can't process)
3. The page has anti-scraping measures in place
4. The domain exists but this specific URL path doesn't have content`;
      }

      // Return the markdown content
      return markdownContent;
      
    } catch (error) {
      console.error("FireCrawl utility error:", error);
      return `I encountered an error while extracting content: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
} 