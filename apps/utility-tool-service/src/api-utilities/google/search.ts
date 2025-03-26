/**
 * Google Search Utility
 * 
 * Performs web searches using the Google Search API and returns formatted results.
 * Useful for finding up-to-date information from the web.
 */
import { BasicUtilityTool, GoogleSearchRequest } from '../../types/index.js';
import { registry } from '../../registry/registry.js';

/**
 * Implementation of the Google Search utility
 */
const googleSearch: BasicUtilityTool = {
  id: 'utility_google_search',
  description: 'Search the web using Google Search API to find up-to-date information',
  schema: {
    query: {
      type: 'string',
      description: 'The search query to send to Google Search'
    },
    limit: {
      type: 'number',
      optional: true,
      description: 'Maximum number of results to return (default: 5, max: 10)'
    }
  },
  
  execute: async (userId: string, conversationId: string, params: GoogleSearchRequest): Promise<any> => {
    try {
      // Extract and validate parameters
      const { query, limit = 5 } = params;
      
      if (!query || typeof query !== 'string') {
        throw new Error("Search query is required and must be a string");
      }
      
      // Ensure limit is between 1 and 10
      const validatedLimit = Math.min(Math.max(1, limit || 5), 10);
      
      console.log(`🔍 [GOOGLE SEARCH] Performing search for: "${query}" (limit: ${validatedLimit})`);
      
      // Use SerpAPI to perform the search
      const apiKey = process.env.SERPAPI_API_KEY;
      if (!apiKey) {
        throw new Error("SERPAPI_API_KEY is not configured in environment variables");
      }
      
      const response = await fetch(`https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${apiKey}`);
      
      if (!response.ok) {
        throw new Error(`Google Search request failed with status ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.organic_results || data.organic_results.length === 0) {
        return {
          query,
          message: "No search results found for your query.",
          results: []
        };
      }

      // Format the search results
      const results = data.organic_results
        .slice(0, validatedLimit)
        .map((result: any) => ({
          title: result.title || 'No title',
          link: result.link || 'No link',
          snippet: result.snippet || 'No snippet available',
          position: result.position
        }));

      return {
        query,
        results_count: results.length,
        results
      };
    } catch (error) {
      console.error("❌ [GOOGLE SEARCH] Error:", error);
      throw error;
    }
  }
};

// Register the utility
registry.register(googleSearch);

// Export the utility
export default googleSearch; 