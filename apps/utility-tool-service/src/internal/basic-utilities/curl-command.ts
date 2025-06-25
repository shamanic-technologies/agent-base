/**
 * CURL Command Utility
 * 
 * Allows agents to execute HTTP requests similar to CURL commands.
 * Uses node-fetch for making the requests.
 */
import {
  InternalUtilityTool,
  ErrorResponse,
  ServiceResponse,
  ExecuteToolResult
} from '@agent-base/types';
import { registry } from '../../registry/registry.js';
import fetch, { RequestInit } from 'node-fetch'; 
import { z } from 'zod';

// --- Local Type Definitions ---

// Zod schema for input parameters
const CurlRequestParamsSchema = z.object({
  url: z.string().describe("The URL to send the request to."),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']).default('GET'),
  headers: z.record(z.string()).optional().describe("Key-value-pairs for request headers."),
  body: z.string().optional().describe("Request body, typically for POST, PUT, PATCH."),
  timeout_ms: z.number().int().positive({ message: "Timeout must be a positive integer." }).optional().default(10000).describe("Request timeout in milliseconds."),
  from_character: z.number().int().nonnegative().optional().default(0).describe("The starting character index from which to return the response body. Defaults to 0."),
});


// --- End Local Definitions ---

/**
 * Implementation of the CURL Command utility
 */
const curlCommandUtility: InternalUtilityTool = {
  id: 'utility_curl_command',
  description: 'Executes a CURL-like HTTP request to a specified URL and returns the response.',
  // JSON schema for the AI/LLM layer (derived from Zod schema conceptually)
  schema: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'The URL to send the request to.' },
      method: { 
        type: 'string', 
        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'], 
        default: 'GET',
        description: 'The HTTP method to use.' 
      },
      headers: { 
        type: 'object', 
        additionalProperties: { type: 'string' },
        description: 'Optional. Key-value pairs for request headers.' 
      },
      body: { type: 'string', description: 'Optional. The request body (e.g., for POST, PUT).' },
      timeout_ms: {type: 'integer', default: 10000, description: 'Optional. Request timeout in milliseconds.'},
      from_character: {type: 'integer', default: 0, description: 'Optional. The starting character index to read the response from. The response is truncated to 4000 characters from this point.'}
    },
    required: ['url'], 
  },
  
  execute: async (
    clientUserId: string, 
    clientOrganizationId: string, 
    platformUserId: string, 
    platformApiKey: string, 
    conversationId: string,
    params: unknown // Validate unknown params with Zod
  ): Promise<ServiceResponse<ExecuteToolResult>> => {

    // 1. Validate parameters with Zod
    const validationResult = CurlRequestParamsSchema.safeParse(params);
    if (!validationResult.success) {
      console.error("[CURL Utility] Invalid parameters:", validationResult.error.flatten());
      return {
        success: false,
        error: "Invalid parameters for CURL command.",
        details: JSON.stringify(validationResult.error.flatten().fieldErrors), // Convert fieldErrors to string
      };
    }

    // Parameters are now validated and typed
    const { url, method, headers, body, timeout_ms, from_character } = validationResult.data;

    // 2. Construct RequestInit for node-fetch and AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout_ms);

    const requestOptions: RequestInit = {
      method: method, // Already defaulted and validated by Zod
      headers: headers, // Optional, validated by Zod
      body: (method !== 'GET' && method !== 'HEAD' && body) ? body : undefined, // Body only for relevant methods
      signal: controller.signal, // Use AbortController signal for timeout
    };


    // 3. Execute fetch call
    try {
      const response = await fetch(url, requestOptions);
      clearTimeout(timeoutId); // Clear the timeout if the request completes

      const responseBody = await response.text(); 
      const fixedMaxLength = 4000;
      const slicedBody = responseBody.substring(from_character, from_character + fixedMaxLength);


      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, name) => {
        responseHeaders[name] = value;
      });
      

      return {
        success: true,
        data: {
          status_code: response.status,
          headers: responseHeaders,
          body: slicedBody,
          original_body_length: responseBody.length,
          from_character: from_character,
          to_character: from_character + fixedMaxLength
        }
      };

    } catch (error: any) {
      clearTimeout(timeoutId); // Ensure timeout is cleared on error too
      console.error(`[CURL Utility] Error during fetch to ${url}:`, error);
      
      let errorMessage = "Failed to execute CURL command.";
      if (error.name === 'AbortError') {
        errorMessage = `Request to ${url} timed out after ${timeout_ms}ms.`;
      } else if (error.cause && error.cause.code) { 
        errorMessage = `Network error for ${url}: ${error.cause.code}`;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        success: false, 
        error: "CURL command execution failed.", 
        details: errorMessage 
      };
    }
  }
};

// Register the utility
registry.register(curlCommandUtility);

// Export the utility
export default curlCommandUtility; 