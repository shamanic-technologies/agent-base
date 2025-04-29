/**
 * Google Search Utility
 * 
 * Performs web searches using the Google Search API via SerpAPI and returns formatted results.
 * Useful for finding up-to-date information from the web.
 */
// Remove axios if fetch is used
// import axios from 'axios';
import { 
  InternalUtilityTool, 
  ErrorResponse,
  JsonSchema
} from '@agent-base/types'; // Corrected path relative to api-utilities/google/
import { registry } from '../../../registry/registry.js'; // Corrected path

// --- Local Type Definitions for this Utility ---

export interface GoogleSearchRequest {
  query: string;
  limit?: number;
}

export interface GoogleSearchResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

export interface GoogleSearchSuccessResponse {
  status: 'success';
  data: { // Encapsulate results in data object
    query: string;
    results_count: number;
    results: GoogleSearchResult[];
    message?: string;
  }
}

export type GoogleSearchResponse = 
  GoogleSearchSuccessResponse | 
  ErrorResponse;

// --- End Local Type Definitions ---

/**
 * Implementation of the Google Search utility
 */
const googleSearchUtility: InternalUtilityTool = {
  id: 'utility_google_search',
  description: 'Search the web using Google Search API (via SerpAPI) to find up-to-date information',
  schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query to send to Google Search.',
        examples: ['latest AI news', 'weather in London']
      },
      limit: {
        type: 'integer',
        description: 'Maximum number of results to return (default: 5, max: 10).',
        minimum: 1,
        maximum: 10,
        examples: [5, 10]
      }
    },
    required: ['query']
  },
  
  execute: async (clientUserId: string, platformUserId: string, platformApiKey: string, conversationId: string, params: GoogleSearchRequest): Promise<GoogleSearchResponse> => {
    const logPrefix = '🔍 [GOOGLE_SEARCH]';
    try {
      // Use raw params
      const { query, limit = 5 } = params || {};

      // Validate query
      if (!query || typeof query !== 'string') {
        return { 
          success: false, 
          error: "Search query is required and must be a string" 
        } as ErrorResponse;
      }
      
      // Ensure limit is between 1 and 10
      const validatedLimit = Math.min(Math.max(1, limit || 5), 10);
      
      console.log(`${logPrefix} Performing search for: "${query}" (limit: ${validatedLimit})`);
      
      // Check for SerpAPI API key
      const apiKey = process.env.SERPAPI_API_KEY;
      if (!apiKey) {
        console.error(`${logPrefix} SERPAPI_API_KEY not set`);
        return { 
          success: false, 
          error: "Service configuration error: SERPAPI_API_KEY is not set." 
        } as ErrorResponse;
      }
      
      // Perform the search using SerpAPI via fetch
      const apiUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&num=${validatedLimit}&api_key=${apiKey}`;
      const apiResponse = await fetch(apiUrl);
      
      // Handle API errors
      if (!apiResponse.ok) {
        const errorDetails = await apiResponse.text(); // Get more details if possible
        console.error(`${logPrefix} SerpAPI error (${apiResponse.status}): ${errorDetails}`);
        return { 
          success: false, 
          error: `Google Search failed (HTTP ${apiResponse.status})`, 
          details: `SerpAPI error: ${errorDetails}` 
        } as ErrorResponse;
      }

      // Parse the response data
      const data = await apiResponse.json();
      
      let successResponse: GoogleSearchSuccessResponse;

      // Handle cases where no results are found
      if (!data.organic_results || data.organic_results.length === 0) {
        successResponse = {
          status: 'success',
          data: {
            query,
            results_count: 0,
            results: [],
            message: "No search results found for your query."
          }
        };
      } else {
        // Format the search results according to the defined type
        const results: GoogleSearchResult[] = data.organic_results
          .slice(0, validatedLimit) // Apply limit again just in case API returns more
          .map((result: any): GoogleSearchResult => ({ // Explicitly type the mapped result
            title: result.title || 'No title',
            link: result.link || 'No link',
            snippet: result.snippet || 'No snippet available',
            position: result.position
          }));

        // Prepare the success response
        successResponse = {
          status: 'success',
          data: {
            query,
            results_count: results.length,
            results
          }
        };
      }
      return successResponse;
      
    } catch (error: any) { // Catch any other unexpected errors
      console.error(`${logPrefix} Unexpected error:`, error);
      // Remove Zod error handling
      return { 
        success: false, 
        error: "An unexpected error occurred during the Google search", 
        details: error instanceof Error ? error.message : String(error)
      } as ErrorResponse;
    }
  }
};

// Register the utility
registry.register(googleSearchUtility);

// Export the utility
export default googleSearchUtility; 