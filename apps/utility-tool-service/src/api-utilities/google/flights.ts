/**
 * Google Flights Utility
 * 
 * Performs flight searches using the Google Flights API via SerpAPI.
 * Useful for finding flight information, prices, routes, and travel options.
 */
import { UtilityTool, GoogleFlightsRequest } from '../../types/index.js';
import { registry } from '../../registry/registry.js';

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
const googleFlights: UtilityTool = {
  id: 'utility_google_flights',
  description: 'Search for flights using Google Flights to find routes, prices, and travel options',
  schema: {
    origin: {
      type: 'string',
      description: 'Origin airport code or city (e.g., "NYC", "New York", "JFK")'
    },
    destination: {
      type: 'string',
      description: 'Destination airport code or city (e.g., "LAX", "London", "Tokyo")'
    },
    departure_date: {
      type: 'string',
      optional: true,
      description: 'Departure date in YYYY-MM-DD format'
    },
    return_date: {
      type: 'string',
      optional: true,
      description: 'Return date in YYYY-MM-DD format for round trips'
    },
    adults: {
      type: 'number',
      optional: true,
      description: 'Number of adult passengers (default: 1)'
    },
    children: {
      type: 'number',
      optional: true,
      description: 'Number of child passengers (default: 0)'
    },
    infants: {
      type: 'number', 
      optional: true,
      description: 'Number of infant passengers (default: 0)'
    },
    cabin_class: {
      type: 'string',
      optional: true,
      description: 'Cabin class preference (economy, premium_economy, business, first)'
    }
  },
  
  execute: async (userId: string, conversationId: string, params: GoogleFlightsRequest): Promise<any> => {
    try {
      // Extract and validate parameters
      const { 
        origin, 
        destination, 
        departure_date,
        return_date,
        adults = 1,
        children = 0,
        infants = 0,
        cabin_class = 'economy' 
      } = params;
      
      if (!origin || typeof origin !== 'string') {
        throw new Error("Origin is required and must be a string");
      }
      
      if (!destination || typeof destination !== 'string') {
        throw new Error("Destination is required and must be a string");
      }
      
      console.log(`✈️ [GOOGLE FLIGHTS] Searching flights from "${origin}" to "${destination}"`);
      
      // Build the API URL
      const apiKey = process.env.SERPAPI_API_KEY;
      if (!apiKey) {
        throw new Error("SERPAPI_API_KEY is not configured in environment variables");
      }
      
      let apiUrl = `https://serpapi.com/search.json?engine=google_flights&api_key=${apiKey}`;
      
      // Add required parameters
      apiUrl += `&departure_id=${encodeURIComponent(origin)}`;
      apiUrl += `&arrival_id=${encodeURIComponent(destination)}`;
      
      // Add optional parameters
      if (departure_date) apiUrl += `&outbound_date=${encodeURIComponent(departure_date)}`;
      if (return_date) apiUrl += `&inbound_date=${encodeURIComponent(return_date)}`;
      if (cabin_class && ['economy', 'premium_economy', 'business', 'first'].includes(cabin_class)) {
        apiUrl += `&type=${encodeURIComponent(cabin_class)}`;
      }
      if (adults && adults > 0) apiUrl += `&adults=${adults}`;
      if (children && children > 0) apiUrl += `&children=${children}`;
      if (infants && infants > 0) apiUrl += `&infants=${infants}`;
      
      // Use SerpAPI to perform the search
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`Google Flights search request failed with status ${response.status}`);
      }

      const data = await response.json();
      
      // Structure the response based on the results
      if (!data.flight_results || !data.flight_results.best_flights || data.flight_results.best_flights.length === 0) {
        return {
          origin,
          destination,
          departure_date: departure_date || null,
          return_date: return_date || null,
          cabin_class: cabin_class || 'economy',
          passengers: {
            adults: adults || 1,
            children: children || 0,
            infants: infants || 0
          },
          results_count: 0,
          message: "No flight results found for your query."
        };
      }

      // Process the best flights
      const flights = data.flight_results.best_flights.map((flight: any) => {
        // Process outbound leg
        const outbound = flight.legs[0];
        const outboundLeg = {
          departure: {
            airport: outbound.departure_airport.name,
            code: outbound.departure_airport.code,
            time: outbound.departure_time
          },
          arrival: {
            airport: outbound.arrival_airport.name,
            code: outbound.arrival_airport.code,
            time: outbound.arrival_time
          },
          duration: outbound.duration_text || formatDuration(outbound.duration),
          stops: outbound.stops || 0,
          layovers: outbound.layovers?.map((layover: any) => ({
            airport: layover.airport,
            duration: layover.layover_duration_text
          })) || [],
          airlines: outbound.airlines?.map((airline: any) => airline.name) || []
        };
        
        // Process return leg if it exists
        let returnLeg = null;
        if (flight.legs.length > 1) {
          const returnData = flight.legs[1];
          returnLeg = {
            departure: {
              airport: returnData.departure_airport.name,
              code: returnData.departure_airport.code,
              time: returnData.departure_time
            },
            arrival: {
              airport: returnData.arrival_airport.name,
              code: returnData.arrival_airport.code,
              time: returnData.arrival_time
            },
            duration: returnData.duration_text || formatDuration(returnData.duration),
            stops: returnData.stops || 0,
            layovers: returnData.layovers?.map((layover: any) => ({
              airport: layover.airport,
              duration: layover.layover_duration_text
            })) || [],
            airlines: returnData.airlines?.map((airline: any) => airline.name) || []
          };
        }
        
        return {
          price: flight.price?.default || flight.price?.total || null,
          currency: flight.price?.currency || 'USD',
          outbound: outboundLeg,
          return: returnLeg,
          carbon_emissions: flight.carbon_emissions?.text || null,
          total_duration: flight.duration_text || null
        };
      });
      
      return {
        origin,
        destination,
        departure_date: departure_date || null,
        return_date: return_date || null,
        cabin_class: cabin_class || 'economy',
        passengers: {
          adults: adults || 1,
          children: children || 0,
          infants: infants || 0
        },
        results_count: flights.length,
        flights,
        price_range: data.flight_results?.price_insights?.overall_value_text || null
      };
    } catch (error) {
      console.error("❌ [GOOGLE FLIGHTS] Error:", error);
      throw error;
    }
  }
};

// Register the utility
registry.register(googleFlights);

// Export the utility
export default googleFlights; 