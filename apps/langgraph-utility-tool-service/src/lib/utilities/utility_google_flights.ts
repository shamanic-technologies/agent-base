/**
 * Google Flights Utility
 * 
 * A tool that performs flight searches using the Google Flights API via SerpAPI and returns formatted results.
 * This utility is useful for finding flight information, prices, routes, and travel options.
 */

import { Tool } from "@langchain/core/tools";
import { z } from "zod";
import { NodeId, NodeType, ParentNodeId, ParentNodeType, ThreadId } from "../../types/index.js";

/**
 * A Google Flights utility that provides flight search results
 */
export class UtilityGoogleFlights extends Tool {
  name = "utility_google_flights";
  description = `
    Use this tool to search for flights using Google Flights API via SerpAPI.
    Provide origin, destination, and dates to get back relevant flight options.
    
    The results include:
    - Flight information (airlines, flight numbers)
    - Departure and arrival times
    - Duration and layover details
    - Price information
    - Airport details
    
    Example queries:
    - Flights from New York to London on July 15
    - Best flights between Paris and Tokyo next month
    - Cheapest flight options from San Francisco to Austin
    
    The tool returns formatted flight results with details about each option.
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
    origin: z.string().describe("Origin airport code or city (e.g., 'NYC', 'New York', 'JFK')"),
    destination: z.string().describe("Destination airport code or city (e.g., 'LAX', 'London', 'Tokyo')"),
    departure_date: z.string().optional().describe("Departure date in YYYY-MM-DD format"),
    return_date: z.string().optional().describe("Return date in YYYY-MM-DD format for round trips (optional)"),
    adults: z.number().optional().describe("Number of adult passengers"),
    children: z.number().optional().describe("Number of child passengers"),
    infants: z.number().optional().describe("Number of infant passengers"),
    cabin_class: z.string().optional().describe("Cabin class preference (economy, premium_economy, business, first)")
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
  
  // Helper function to format duration in minutes to human-readable format
  private formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }
  
  async _call(input: string | { 
    origin: string; 
    destination: string; 
    departure_date?: string;
    return_date?: string;
    adults?: number;
    children?: number;
    infants?: number;
    cabin_class?: string;
  }): Promise<string> {
    try {
      // Parse input - handle both string and object formats
      let origin: string;
      let destination: string;
      let departureDate: string | undefined;
      let returnDate: string | undefined;
      let adults: number | undefined;
      let children: number | undefined;
      let infants: number | undefined;
      let cabinClass: string | undefined;
      
      if (typeof input === 'string') {
        // Attempt to parse the string input to extract parameters
        // This is a simple implementation - in a real system, you might use NLP
        const inputStr = input.toLowerCase();
        
        // Try to extract origin and destination using common patterns
        const fromToMatch = inputStr.match(/from\s+([a-z\s]+)\s+to\s+([a-z\s]+)/i);
        if (fromToMatch) {
          origin = fromToMatch[1].trim();
          destination = fromToMatch[2].trim();
        } else {
          throw new Error("Could not parse origin and destination from input string. Please use structured input.");
        }
        
        // Try to extract dates using common patterns
        const dateMatch = inputStr.match(/(20\d{2}-\d{2}-\d{2})/g);
        if (dateMatch && dateMatch.length >= 1) {
          departureDate = dateMatch[0];
          if (dateMatch.length >= 2) {
            returnDate = dateMatch[1];
          }
        }
        
        // Look for cabin class
        if (inputStr.includes('economy')) cabinClass = 'economy';
        else if (inputStr.includes('premium economy')) cabinClass = 'premium_economy';
        else if (inputStr.includes('business')) cabinClass = 'business';
        else if (inputStr.includes('first')) cabinClass = 'first';
      } else if (input && typeof input === 'object') {
        // If it's an object, extract properties directly
        origin = input.origin.trim();
        destination = input.destination.trim();
        departureDate = input.departure_date?.trim();
        returnDate = input.return_date?.trim();
        adults = input.adults;
        children = input.children;
        infants = input.infants;
        cabinClass = input.cabin_class?.trim();
      } else {
        throw new Error("Invalid input: Origin and destination are required");
      }
      
      // Validate inputs
      if (!origin || !destination) {
        throw new Error("Both origin and destination are required");
      }
      
      console.log(`Performing Google Flights search from: "${origin}" to: "${destination}"`);
      if (departureDate) console.log(`Departure date: ${departureDate}`);
      if (returnDate) console.log(`Return date: ${returnDate}`);
      
      // Build the API URL
      let apiUrl = `https://serpapi.com/search.json?engine=google_flights&api_key=${process.env.SERPAPI_API_KEY || ''}`;
      
      // Add required parameters
      apiUrl += `&departure_id=${encodeURIComponent(origin)}`;
      apiUrl += `&arrival_id=${encodeURIComponent(destination)}`;
      
      // Add optional parameters
      if (departureDate) apiUrl += `&outbound_date=${encodeURIComponent(departureDate)}`;
      if (returnDate) apiUrl += `&inbound_date=${encodeURIComponent(returnDate)}`;
      if (adults) apiUrl += `&adults=${adults}`;
      if (children) apiUrl += `&children=${children}`;
      if (infants) apiUrl += `&infants=${infants}`;
      if (cabinClass) apiUrl += `&cabin=${encodeURIComponent(cabinClass)}`;
      
      // Use SerpAPI to perform the search
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`Google Flights search request failed with status ${response.status}`);
      }

      const data = await response.json();
      
      // Check if we have flight results
      if (!data.flights_results && !data.best_flights && !data.other_flights) {
        return "No flight results found for your search.";
      }

      // Format the search results
      let formattedResults = "";
      
      // Function to format a single flight
      const formatFlight = (flight: any, index: number) => {
        let result = `\nFlight Option ${index + 1}:\n`;
        
        // Price and duration info
        result += `Price: ${flight.price ? `$${flight.price}` : 'Price not available'}\n`;
        result += `Duration: ${flight.total_duration ? this.formatDuration(flight.total_duration) : 'Duration not available'}\n`;
        
        // Flight type (nonstop, one-stop, etc)
        if (flight.type) {
          result += `Type: ${flight.type}\n`;
        }
        
        // Flight legs information
        if (flight.flights && flight.flights.length > 0) {
          result += `\nItinerary:\n`;
          
          flight.flights.forEach((leg: any, legIndex: number) => {
            if (legIndex > 0) result += "\n";
            
            // Flight departure and arrival
            const departure = leg.departure_airport;
            const arrival = leg.arrival_airport;
            
            result += `${departure.id} (${departure.time}) → ${arrival.id} (${arrival.time})\n`;
            
            // Airline info
            if (leg.airline) {
              result += `Airline: ${leg.airline}`;
              if (leg.flight_number) result += ` ${leg.flight_number}`;
              result += '\n';
            }
          });
        }
        
        // Layover information
        if (flight.layovers && flight.layovers.length > 0) {
          result += `\nLayovers:\n`;
          flight.layovers.forEach((layover: any) => {
            result += `${layover.id}: ${this.formatDuration(layover.duration)}\n`;
          });
        }
        
        result += "-------------------";
        return result;
      };
      
      // Handle best flights
      if (data.best_flights && data.best_flights.length > 0) {
        formattedResults += "Best Flight Options:\n";
        data.best_flights.forEach((flight: any, index: number) => {
          formattedResults += formatFlight(flight, index);
        });
      }
      
      // Handle other flights
      if (data.other_flights && data.other_flights.length > 0) {
        if (formattedResults) formattedResults += "\n\n";
        formattedResults += "Other Flight Options:\n";
        data.other_flights.slice(0, 3).forEach((flight: any, index: number) => {
          formattedResults += formatFlight(flight, index);
        });
        
        // If there are more flights, add a note
        if (data.other_flights.length > 3) {
          formattedResults += `\n(${data.other_flights.length - 3} more options available)`;
        }
      }
      
      // If neither best_flights nor other_flights, but we have flights_results
      if (!data.best_flights && !data.other_flights && data.flights_results) {
        formattedResults += "Flight Options:\n";
        data.flights_results.forEach((flight: any, index: number) => {
          formattedResults += formatFlight(flight, index);
        });
      }

      // Return formatted results
      return `Flight results from ${origin} to ${destination}${departureDate ? ` on ${departureDate}` : ''}:\n${formattedResults}`;
      
    } catch (error) {
      console.error("Google Flights utility error:", error);
      return `I encountered an error while searching for flights: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
} 