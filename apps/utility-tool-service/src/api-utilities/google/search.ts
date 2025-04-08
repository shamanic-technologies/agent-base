/**
 * Google Search Utility
 * 
 * Performs web searches using the Google Search API and returns formatted results.
 * Useful for finding up-to-date information from the web.
 */
import { 
  UtilityTool, 
  GoogleSearchRequest, 
  GoogleSearchResponse, 
  GoogleSearchSuccessResponse, 
  UtilityErrorResponse,
  GoogleSearchResult 
} from '../../types/index.js';
import { registry } from '../../registry/registry.js';

/**
 * Implementation of the Google Search utility
 */
const googleSearch: UtilityTool = {
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
  
  execute: async (userId: string, conversationId: string, params: GoogleSearchRequest): Promise<GoogleSearchResponse> => {
    // Extract and validate parameters
    const { query, limit = 5 } = params;

    try {
      // Validate query
      if (!query || typeof query !== 'string') {
        const errorResponse: UtilityErrorResponse = {
          status: 'error',
          error: "Search query is required and must be a string"
        };
        return errorResponse;
      }
      
      // Ensure limit is between 1 and 10
      const validatedLimit = Math.min(Math.max(1, limit || 5), 10);
      
      console.log(`🔍 [GOOGLE SEARCH] Performing search for: "${query}" (limit: ${validatedLimit})`);
      
      // Check for SerpAPI API key
      const apiKey = process.env.SERPAPI_API_KEY;
      if (!apiKey) {
        const errorResponse: UtilityErrorResponse = {
          status: 'error',
          error: "SERPAPI_API_KEY is not configured in environment variables"
        };
        return errorResponse;
      }
      
      // Perform the search using SerpAPI
      const apiResponse = await fetch(`https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${apiKey}`);
      
      // Handle API errors
      if (!apiResponse.ok) {
        const errorDetails = await apiResponse.text(); // Get more details if possible
        const errorResponse: UtilityErrorResponse = {
          status: 'error',
          error: `Google Search request failed with status ${apiResponse.status}`,
          details: errorDetails
        };
        return errorResponse;
      }

      // Parse the response data
      const data = await apiResponse.json();
      
      // Handle cases where no results are found
      if (!data.organic_results || data.organic_results.length === 0) {
        const successResponse: GoogleSearchSuccessResponse = {
          status: 'success',
          query,
          results_count: 0,
          results: [],
          message: "No search results found for your query."
        };
        return successResponse;
      }

      // Format the search results according to the defined type
      const results: GoogleSearchResult[] = data.organic_results
        .slice(0, validatedLimit)
        .map((result: any): GoogleSearchResult => ({ // Explicitly type the mapped result
          title: result.title || 'No title',
          link: result.link || 'No link',
          snippet: result.snippet || 'No snippet available',
          position: result.position
        }));

      // Prepare the success response
      const successResponse: GoogleSearchSuccessResponse = {
        status: 'success',
        query,
        results_count: results.length,
        results
      };
      return successResponse;
      
    } catch (error) {
      // Handle unexpected errors during execution
      console.error("❌ [GOOGLE SEARCH] Unexpected error:", error);
      const errorResponse: UtilityErrorResponse = {
        status: 'error',
        error: "An unexpected error occurred during the Google search",
        details: error instanceof Error ? error.message : "Unknown error"
      };
      return errorResponse;
    }
  }
};

// Register the utility
registry.register(googleSearch);

// Export the utility
export default googleSearch; 