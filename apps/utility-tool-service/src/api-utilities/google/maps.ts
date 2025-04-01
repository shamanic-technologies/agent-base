/**
 * Google Maps Utility
 * 
 * Performs location-based searches using the Google Maps API via SerpAPI.
 * Useful for finding places, businesses, and detailed location information.
 */
import { UtilityTool, GoogleMapsRequest } from '../../types/index.js';
import { registry } from '../../registry/registry.js';

/**
 * Implementation of the Google Maps utility
 */
const googleMaps: UtilityTool = {
  id: 'utility_google_maps',
  description: 'Search for locations, businesses, and places using Google Maps',
  schema: {
    query: {
      type: 'string',
      description: 'The search query for places/locations (e.g., "pizza", "coffee shops")'
    },
    location: {
      type: 'string',
      optional: true,
      description: 'Optional specific location to search in (e.g., "New York, NY")'
    },
    limit: {
      type: 'number',
      optional: true,
      description: 'Maximum number of results to return (default: 5, max: 10)'
    }
  },
  
  execute: async (userId: string, conversationId: string, params: GoogleMapsRequest): Promise<any> => {
    try {
      // Extract and validate parameters
      const { query, location, limit = 5 } = params;
      
      if (!query || typeof query !== 'string') {
        throw new Error("Search query is required and must be a string");
      }
      
      // Ensure limit is between 1 and 10
      const validatedLimit = Math.min(Math.max(1, limit || 5), 10);
      
      console.log(`🗺️ [GOOGLE MAPS] Searching for "${query}"${location ? ` in ${location}` : ''} (limit: ${validatedLimit})`);
      
      // Build the API URL
      const apiKey = process.env.SERPAPI_API_KEY;
      if (!apiKey) {
        throw new Error("SERPAPI_API_KEY is not configured in environment variables");
      }
      
      let apiUrl = `https://serpapi.com/search.json?engine=google_maps&q=${encodeURIComponent(query)}&api_key=${apiKey}`;
      
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
      
      // Structure the response based on the type of results received
      if (data.place_results) {
        // Single place detail
        const place = data.place_results;
        return {
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
            status: place.open_state || place.opens_date || null,
            phone: place.phone || null,
            website: place.website || null,
            description: place.description || null,
            coordinates: place.gps_coordinates || null
          }
        };
      } else if (data.local_results && data.local_results.length > 0) {
        // Multiple places
        const places = data.local_results.slice(0, validatedLimit).map((place: any) => ({
          name: place.title || null,
          address: place.address || null,
          rating: place.rating || null,
          reviews_count: place.reviews || 0,
          type: place.type || null,
          price_level: place.price || null,
          status: place.open_state || place.opens_date || null,
          phone: place.phone || null,
          website: place.website || null,
          description: place.description || null,
          coordinates: place.gps_coordinates || null
        }));
        
        return {
          query,
          location: location || null,
          results_count: places.length,
          type: 'place_list',
          results: places
        };
      } else {
        // No results found
        return {
          query,
          location: location || null,
          results_count: 0,
          message: "No place results found for your query."
        };
      }
    } catch (error) {
      console.error("❌ [GOOGLE MAPS] Error:", error);
      throw error;
    }
  }
};

// Register the utility
registry.register(googleMaps);

// Export the utility
export default googleMaps; 