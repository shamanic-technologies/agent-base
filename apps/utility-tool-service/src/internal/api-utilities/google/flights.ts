/**
 * Google Flights Utility
 * 
 * Performs flight searches using the Google Flights API via SerpAPI.
 * Useful for finding flight information, prices, routes, and travel options.
 */
import axios from 'axios';
import { 
  InternalUtilityTool,
  ErrorResponse,
  JsonSchema
} from '@agent-base/types';  
import { registry } from '../../../registry/registry.js';

// --- Local Type Definitions for this Utility ---

export interface GoogleFlightsRequest {
  origin: string;
  destination: string;
  departure_date?: string; // Made optional to align with schema
  return_date?: string;
  adults?: number;
  children?: number;
  infants?: number;
  cabin_class?: string;
}

// Define cabin class options
const cabinClasses = ['economy', 'premium_economy', 'business', 'first'] as const;
type CabinClass = typeof cabinClasses[number];

// Define structure for flight leg
interface FlightLeg {
  departure: { airport: string; code: string; time: string };
  arrival: { airport: string; code: string; time: string };
  duration: string;
  stops: number;
  layovers: { airport: string; duration: string }[];
  airlines: string[];
}

// Define structure for a single flight result
interface FlightResult {
  price: number | null;
  currency: string;
  outbound: FlightLeg;
  return?: FlightLeg | null;
  carbon_emissions?: string | null;
  total_duration?: string | null;
}

// Define success response structure
interface GoogleFlightsSuccessResponse {
  status: 'success';
  data: {
    origin: string;
    destination: string;
    departure_date?: string | null;
    return_date?: string | null;
    cabin_class: CabinClass;
    passengers: { adults: number; children: number; infants: number };
    results_count: number;
    flights: FlightResult[];
    price_range?: string | null;
    message?: string; // Include message for no results case
  }
}

type GoogleFlightsResponse = GoogleFlightsSuccessResponse | ErrorResponse;

// --- End Local Type Definitions ---

/**
 * Helper function to format duration in minutes to human-readable format
 */
function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

/**
 * Implementation of the Google Flights utility
 */
const googleFlightsUtility: InternalUtilityTool = {
  id: 'utility_google_flights',
  description: 'Search for flights using Google Flights (via SerpAPI) to find routes, prices, and travel options.',
  schema: {
    origin: { 
      jsonSchema: {
        type: 'string',
        description: 'Origin airport code or city (e.g., "NYC", "New York", "JFK")',
        examples: ['JFK', 'London']
      } satisfies JsonSchema,
    },
    destination: { 
      jsonSchema: {
        type: 'string',
        description: 'Destination airport code or city (e.g., "LAX", "Tokyo", "CDG")',
        examples: ['LAX', 'Paris']
      } satisfies JsonSchema,
    },
    departure_date: { 
      jsonSchema: {
        type: 'string',
        description: 'Departure date in YYYY-MM-DD format.',
        pattern: '^\\d{4}-\\d{2}-\\d{2}$',
        examples: ['2024-12-20']
      } satisfies JsonSchema,
    },
    return_date: { 
      jsonSchema: {
        type: 'string',
        description: 'Return date in YYYY-MM-DD format for round trips.',
        pattern: '^\\d{4}-\\d{2}-\\d{2}$',
        examples: ['2025-01-05']
      } satisfies JsonSchema,
    },
    adults: { 
      jsonSchema: {
        type: 'integer',
        description: 'Number of adult passengers (default: 1).',
        minimum: 1,
        examples: [1, 2]
      } satisfies JsonSchema,
    },
    children: { 
      jsonSchema: {
        type: 'integer',
        description: 'Number of child passengers (default: 0).',
        minimum: 0,
        examples: [0, 1]
      } satisfies JsonSchema,
    },
    infants: { 
      jsonSchema: {
        type: 'integer',
        description: 'Number of infant passengers (default: 0).',
        minimum: 0,
        examples: [0]
      } satisfies JsonSchema,
    },
    cabin_class: { 
      jsonSchema: {
        type: 'string',
        description: 'Cabin class preference.',
        enum: cabinClasses,
        examples: ['economy', 'business']
      } satisfies JsonSchema,
    }
  },
  
  execute: async (userId: string, conversationId: string, params: GoogleFlightsRequest): Promise<GoogleFlightsResponse> => {
    const logPrefix = '✈️ [GOOGLE_FLIGHTS]';
    try {
      // Use raw params
      const { 
        origin, 
        destination, 
        departure_date,
        return_date,
        adults = 1,
        children = 0,
        infants = 0,
        cabin_class = 'economy' 
      } = params || {};
      
      // Basic validation
      if (!origin || typeof origin !== 'string') {
        return { success: false, error: "Origin is required and must be a string" } as ErrorResponse;
      }
      if (!destination || typeof destination !== 'string') {
        return { success: false, error: "Destination is required and must be a string" } as ErrorResponse;
      }
      // Add date format validation maybe?
      
      console.log(`${logPrefix} Searching flights from "${origin}" to "${destination}"`);
      
      // Build the API URL
      const apiKey = process.env.SERPAPI_API_KEY;
      if (!apiKey) {
        console.error(`${logPrefix} SERPAPI_API_KEY not set`);
          return { success: false, error: "Service configuration error: SERPAPI_API_KEY is not set." } as ErrorResponse;
      }
      
      let apiUrl = `https://serpapi.com/search.json?engine=google_flights&api_key=${apiKey}`;
      
      // Add required parameters
      apiUrl += `&departure_id=${encodeURIComponent(origin)}`;
      apiUrl += `&arrival_id=${encodeURIComponent(destination)}`;
      
      // Add optional parameters
      if (departure_date) apiUrl += `&outbound_date=${encodeURIComponent(departure_date)}`;
      if (return_date) apiUrl += `&inbound_date=${encodeURIComponent(return_date)}`;
      if (cabin_class && cabinClasses.includes(cabin_class as CabinClass)) { // Use defined cabin classes
        apiUrl += `&type=${encodeURIComponent(cabin_class)}`;
      }
      if (adults > 0) apiUrl += `&adults=${adults}`;
      if (children > 0) apiUrl += `&children=${children}`;
      if (infants > 0) apiUrl += `&infants=${infants}`;
      
      // Use fetch API
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`${logPrefix} SerpAPI error (${response.status}): ${errorText}`);
        return {
            success: false,
            error: `Google Flights search failed (HTTP ${response.status})`,
            details: `SerpAPI error: ${errorText}`
        } as ErrorResponse;
      }

      const data = await response.json();
      
      // Structure the response based on the results
      const flightResults = data.best_flights || data.other_flights || []; // Check both best and other flights
      
      if (flightResults.length === 0) {
        const noResultsResponse: GoogleFlightsSuccessResponse = {
            status: 'success',
            data: {
                origin,
                destination,
                departure_date: departure_date || null,
                return_date: return_date || null,
                cabin_class: cabin_class as CabinClass,
                passengers: { adults, children, infants },
                results_count: 0,
                flights: [],
                message: "No flight results found for your query."
            }
        };
        return noResultsResponse;
      }

      // Process the flights
      const flights = flightResults.map((flight: any): FlightResult => {
        const outbound = flight.flights[0]; // SerpAPI structure differs slightly
        const outboundLeg: FlightLeg = {
          departure: { airport: outbound.departure_airport.name, code: outbound.departure_airport.id, time: outbound.departure_airport.time },
          arrival: { airport: outbound.arrival_airport.name, code: outbound.arrival_airport.id, time: outbound.arrival_airport.time },
          duration: formatDuration(outbound.duration),
          stops: outbound.stops || 0,
          layovers: outbound.layovers?.map((layover: any) => ({ airport: layover.name, duration: formatDuration(layover.duration) })) || [],
          airlines: outbound.airline ? [outbound.airline] : [] // Assuming single airline per leg in this structure
        };
        
        let returnLeg: FlightLeg | null = null;
        if (flight.flights.length > 1) {
          const returnData = flight.flights[1];
          returnLeg = {
            departure: { airport: returnData.departure_airport.name, code: returnData.departure_airport.id, time: returnData.departure_airport.time },
            arrival: { airport: returnData.arrival_airport.name, code: returnData.arrival_airport.id, time: returnData.arrival_airport.time },
            duration: formatDuration(returnData.duration),
            stops: returnData.stops || 0,
            layovers: returnData.layovers?.map((layover: any) => ({ airport: layover.name, duration: formatDuration(layover.duration) })) || [],
            airlines: returnData.airline ? [returnData.airline] : []
          };
        }
        
        return {
          price: flight.price || null,
          currency: data.search_parameters?.currency || 'USD',
          outbound: outboundLeg,
          return: returnLeg,
          carbon_emissions: flight.carbon_emissions?.this_flight || null, // Adjusted path
          total_duration: formatDuration(flight.total_duration)
        };
      });
      
      const successResponse: GoogleFlightsSuccessResponse = {
        status: 'success',
        data: {
          origin,
          destination,
          departure_date: departure_date || null,
          return_date: return_date || null,
          cabin_class: cabin_class as CabinClass,
          passengers: { adults, children, infants },
          results_count: flights.length,
          flights,
          price_range: data.price_insights?.lowest_price ? `From ${data.price_insights.lowest_price}${data.search_parameters?.currency}` : null // Adjusted path
        }
      };
      return successResponse;

    } catch (error: any) {
      console.error(`${logPrefix} Error:`, error);
      // Remove Zod error handling
      // Return standard UtilityErrorResponse
      return {
        success: false,
        error: 'Failed to search for Google Flights',
        details: error instanceof Error ? error.message : String(error)
      } as ErrorResponse;
    }
  }
};

// Register the utility
registry.register(googleFlightsUtility);

// Export the utility
export default googleFlightsUtility; 