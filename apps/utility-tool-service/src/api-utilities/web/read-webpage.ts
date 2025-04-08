/**
 * FireCrawl Web Content Extraction Utility
 * 
 * Extracts content from web pages using the FireCrawl API and returns it in markdown format.
 * Useful for fetching clean, LLM-friendly content from websites.
 */
import { UtilityTool } from '../../types/index.js';
import { registry } from '../../registry/registry.js';

// --- Local Type Definitions ---
// Moved from types/index.ts
export interface FireCrawlExtractContentRequest {
  url: string;
  onlyMainContent?: boolean;
}
// Assuming success response is the complex object returned by FireCrawl
// Assuming error is handled by throwing
type ReadWebPageResponse = any; // Use specific type if known, or keep 'any'
// --- End Local Definitions ---

/**
 * Implementation of the FireCrawl content extraction utility
 */
const readWebPage: UtilityTool = {
  id: 'utility_read_webpage',
  description: 'Read the content of a webpage',
  schema: {
    url: {
      type: 'string',
      description: 'The URL to fetch content from (must include http:// or https://)'
    },
    onlyMainContent: {
      type: 'boolean',
      optional: true,
      description: 'Whether to extract only the main content without navigation, headers, footers, etc. (default: true)'
    }
  },
  
  execute: async (userId: string, conversationId: string, params: FireCrawlExtractContentRequest): Promise<ReadWebPageResponse> => {
    try {
      // Extract and validate parameters
      const { url, onlyMainContent = true } = params;
      
      if (!url || typeof url !== 'string') {
        throw new Error("URL is required and must be a string");
      }
      
      // Validate URL format
      if (!url.match(/^https?:\/\/.+/)) {
        throw new Error("Invalid URL format. URL must start with http:// or https://");
      }
      
      console.log(`🔥 [FIRECRAWL] Extracting content from: "${url}" (onlyMainContent: ${onlyMainContent})`);
      
      // Use FireCrawl API to fetch content from the URL
      const apiKey = process.env.FIRECRAWL_API_KEY;
      if (!apiKey) {
        throw new Error("FIRECRAWL_API_KEY is not configured in environment variables");
      }
      console.log('Firecrawl apiKey', apiKey);
      const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          url: url,
          onlyMainContent: onlyMainContent,
          formats: ["markdown"] // Removed "text" as it's invalid according to FireCrawl API
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`FireCrawl API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(`Failed to fetch content: ${data.message || 'No error message provided'}`);
      }

      // Check if the response contains content
      if (!data.data || (!data.data.markdown && !data.data.text)) {
        throw new Error("The URL was accessed but no content was found");
      }

      // Return the extraction results
      return {
        url: url,
        title: data.data.title || null,
        favicon: data.data.favicon || null,
        markdown: data.data.markdown || null,
        text: data.data.text || null,
        language: data.data.language || null,
        word_count: data.data.word_count || 0,
        detected_content_type: data.data.contentType || null,
        extracted_at: new Date().toISOString()
      };
    } catch (error) {
      console.error("❌ [FIRECRAWL] Error:", error);
      throw error;
    }
  }
};

// Register the utility
registry.register(readWebPage);

// Export the utility
export default readWebPage; 