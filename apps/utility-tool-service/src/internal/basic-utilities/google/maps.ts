/**
 * Google Maps Utility
 * 
 * Performs location-based searches using the Google Maps API via SerpAPI.
 * Useful for finding places, businesses, and detailed location information.
 */
import axios from 'axios';
import { 
  InternalUtilityTool,
  ErrorResponse, // Import if needed
  ServiceResponse,
  ExecuteToolResult,
  UtilityProvider
} from '@agent-base/types'; // Corrected path relative to api-utilities/google/
import { registry } from '../../../registry/registry.js'; // Corrected path

// --- Local Type Definitions for this Utility ---

export interface GoogleMapsRequest {
  query: string;
  location?: string;
  limit?: number;
}

// Define structure for a single place result
interface PlaceResult {
  name: string | null;
  address: string | null;
  rating?: number | null;
  reviews_count?: number;
  type?: string | null;
  price_level?: string | null;
  status?: string | null;
  phone?: string | null;
  website?: string | null;
  description?: string | null;
  coordinates?: { latitude: number; longitude: number } | null;
}

// Define success response structure
interface GoogleMapsSuccessResponse_Local {
    query: string;
    location?: string | null;
    results_count: number;
    type: 'single_place' | 'place_list' | 'no_results';
    result?: PlaceResult; // For single place
    results?: PlaceResult[]; // For list of places
    message?: string; // For no results
}

type GoogleMapsResponse = GoogleMapsSuccessResponse_Local | ErrorResponse;

// --- End Local Type Definitions ---

/**
 * Implementation of the Google Maps utility
 */
const googleMapsUtility: InternalUtilityTool = {
  id: 'utility_google_maps',
  description: 'Search for locations, businesses, and places using Google Maps (via SerpAPI).',
  schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query for places/locations (e.g., "pizza", "coffee shops near Eiffel Tower")',
        examples: ['coffee shops', 'Eiffel Tower']
      },
      location: {
        type: 'string',
        description: 'Optional specific location context to search within (e.g., "New York, NY", "Paris, France")',
        examples: ['San Francisco, CA']
      },
      limit: {
        type: 'integer',
        description: 'Maximum number of results to return (default: 5, max: 20).',
        minimum: 1,
        maximum: 20,
        examples: [5, 10]
      }
    },
    required: ['query']
  },
  
  execute: async (clientUserId: string, clientOrganizationId: string, platformUserId: string, platformApiKey: string, conversationId: string, params: GoogleMapsRequest): Promise<ServiceResponse<ExecuteToolResult>> => {
    const logPrefix = '🗺️ [GOOGLE_MAPS]';
    try {
      // Use raw params
      const { query, location, limit = 5 } = params || {};
      
      // Basic validation
      if (!query || typeof query !== 'string') {
        return { success: false, error: "Search query is required and must be a string" } as ErrorResponse;
      }
      
      // Ensure limit is within reasonable bounds (e.g., 1-20 for SerpAPI maps)
      const validatedLimit = Math.min(Math.max(1, limit || 5), 20);
      
      console.log(`${logPrefix} Searching for "${query}"${location ? ` in ${location}` : ''} (limit: ${validatedLimit})`);
      
      // Build the API URL
      const apiKey = process.env.SERPAPI_API_KEY;
      if (!apiKey) {
        console.error(`${logPrefix} SERPAPI_API_KEY not set`);
        return {
          success: false,
          error: "Service configuration error: SERPAPI_API_KEY is not set.",
          hint: 'Contact support, and ask them to set the SERPAPI_API_KEY environment variable.'
        } as ErrorResponse;
      }
      
      let apiUrl = `https://serpapi.com/search.json?engine=google_maps&q=${encodeURIComponent(query)}&api_key=${apiKey}`;
      
      // Add location parameter if provided
      if (location) {
        apiUrl += `&location=${encodeURIComponent(location)}`;
      }
      apiUrl += `&num=${validatedLimit}`; // Add limit to API call if supported by endpoint
      
      // Use fetch API
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`${logPrefix} SerpAPI error (${response.status}): ${errorText}`);
        return { 
            success: false, 
            error: `Google Maps search failed (HTTP ${response.status})`, 
            details: `SerpAPI error: ${errorText}`,
            hint: 'Contact support if the problem persists.'
        } as ErrorResponse;
      }

      const data = await response.json();
      
      let toolSpecificSuccessData: GoogleMapsSuccessResponse_Local;

      // Structure the response based on the type of results received
      if (data.place_results) {
        // Single place detail
        const place = data.place_results;
        toolSpecificSuccessData = {

            query,
            location: location || null,
            results_count: 1,
            type: 'single_place',
            result: {
              name: place.title || null,
              address: place.address || null,
              rating: place.rating || null,
              reviews_count: place.reviews || 0,
              type: place.type || null,
              price_level: place.price || null,
              status: place.open_state || place.operating_hours?.current_status || null, // Check operating hours too
              phone: place.phone || null,
              website: place.website || null,
              description: place.description || null,
              coordinates: place.gps_coordinates || null
            }
        };
      } else if (data.local_results && data.local_results.length > 0) {
        // Multiple places
        const places = data.local_results.slice(0, validatedLimit).map((place: any): PlaceResult => ({
          name: place.title || null,
          address: place.address || null,
          rating: place.rating || null,
          reviews_count: place.reviews || 0,
          type: place.type || null,
          price_level: place.price || null,
          status: place.open_state || place.operating_hours?.current_status || null, // Check operating hours too
          phone: place.phone || null,
          website: place.website || null,
          description: place.description || null,
          coordinates: place.gps_coordinates || null
        }));
        
        toolSpecificSuccessData = {

            query,
            location: location || null,
            results_count: places.length,
            type: 'place_list',
            results: places
        };
      } else {
        // No results found
        toolSpecificSuccessData = {

            query,
            location: location || null,
            results_count: 0,
            type: 'no_results',
            message: "No place results found for your query."
        };
      }
      return { success: true, data: toolSpecificSuccessData };

    } catch (error: any) {
      console.error(`${logPrefix} Error:`, error);
      // Remove Zod error handling
      // Return standard UtilityErrorResponse
      return {
        success: false,
        error: 'Failed to search Google Maps',
        details: error instanceof Error ? error.message : String(error),
        hint: 'Contact support if the problem persists.'
      } as ErrorResponse;
    }
  }
};

// Register the utility
registry.register(googleMapsUtility);

// Export the utility
export default googleMapsUtility; 