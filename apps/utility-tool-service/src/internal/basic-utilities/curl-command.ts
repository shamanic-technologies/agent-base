/**
 * CURL Command Utility
 * 
 * Allows agents to execute HTTP requests similar to CURL commands.
 * Uses node-fetch for making the requests.
 */
import {
  InternalUtilityTool,
  ErrorResponse,
} from '@agent-base/types';
import { registry } from '../../registry/registry.js';
import fetch, { RequestInit } from 'node-fetch'; 
import { z } from 'zod';

// --- Local Type Definitions ---

// Zod schema for input parameters
const CurlRequestParamsSchema = z.object({
  url: z.string().url({ message: "Invalid URL format." }),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']).default('GET'),
  headers: z.record(z.string()).optional().describe("Key-value pairs for request headers."),
  body: z.string().optional().describe("Request body, typically for POST, PUT, PATCH."),
  timeout_ms: z.number().int().positive({ message: "Timeout must be a positive integer." }).optional().default(10000).describe("Request timeout in milliseconds."),
});

// Infer the type from Zod schema
type CurlRequestParams = z.infer<typeof CurlRequestParamsSchema>;

// Define a more specific success response structure
interface CurlSuccessResponse {
  status_code: number;
  headers: Record<string, string>;
  body: string;
}
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
      url: { type: 'string', format: 'uri', description: 'The URL to send the request to.' },
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
      timeout_ms: {type: 'integer', default: 10000, description: 'Optional. Request timeout in milliseconds.'}
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
  ): Promise<CurlSuccessResponse | ErrorResponse> => {
    console.log(`[CURL Utility] Executing for conversation ${conversationId}, clientUser ${clientUserId}, platformUser ${platformUserId}`);

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
    const { url, method, headers, body, timeout_ms } = validationResult.data;

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

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, name) => {
        responseHeaders[name] = value;
      });
      

      return {
        status_code: response.status,
        headers: responseHeaders,
        body: responseBody,
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