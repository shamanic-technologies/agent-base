/**
 * Error Handlers for Vercel AI SDK Backend
 * 
 * Utilities for handling different types of errors in the agent service
 * Following Vercel AI SDK documentation patterns
 */

import { UtilityError } from '../../types/index.js';
import { ErrorResponse } from '@agent-base/types';
import axios from 'axios';

/**
 * Handle errors from Axios API calls
 * @param error - The error object received, typically from an Axios request.
 * @param apiUrl - Optional friendly name for the API endpoint for clearer error messages.
 * @returns A structured UtilityError object.
 */
export function handleAxiosError(error: any, apiUrl: string = 'API'): UtilityError {
  if (axios.isAxiosError(error)) {
    // Handle network errors (no response received)
    if (!error.response) {
      return {
        error: true, // Indicate it's an error object
        message: `Network error: Failed to connect to ${apiUrl}`,
        status: 'error', // Status category
        code: 'NETWORK_ERROR', // Specific error code
        details: error.message // Include original Axios error message if available
      };
    }
    
    // Handle API errors (response received but indicates failure)
    return {
      error: true, // Indicate it's an error object
      // Prioritize error message from API response, fallback to Axios message
      message: error.response.data?.error || error.response.data?.message || error.message, 
      status: 'error', // Status category
      code: 'API_ERROR', // Specific error code
      statusCode: error.response.status, // HTTP status code from the response
      // Include response data if available, might contain useful details
      details: error.response.data ? JSON.stringify(error.response.data) : error.message 
    };
  }
  
  // Handle generic non-Axios errors
  return {
    error: true, // Indicate it's an error object
    message: error instanceof Error ? error.message : String(error),
    status: 'error', // Status category
    code: 'UNKNOWN_ERROR', // Specific error code
    details: error instanceof Error ? error.stack : undefined // Include stack trace if available
  };
}

/**
 * Handle tool errors for AI SDK stream piping.
 * Formats the error into a JSON string representing an ErrorResponse object 
 * from common types, suitable for stream piping.
 * @param error - The error object caught during tool execution.
 * @returns A JSON string representing the ErrorResponse.
 */
export function handleToolError(error: any): string {
  console.error(`✅ [Tool Error] Formatting error for stream pipe:`, error);

  // Initialize with default ErrorResponse structure
  let response: ErrorResponse = {
    success: false,
    error: 'An unexpected tool error occurred.', // Default primary message
    details: undefined // Default details
  };

  let detailPayload: Record<string, any> = {}; // Store structured details here

  // AI SDK Rate Limiting and other API errors
  // More robust check for the specific rate limit error structure from Anthropic
  if (error?.data?.error?.type === 'rate_limit_error') {
      response.error = 'The service is currently experiencing high demand and the rate limit has been exceeded. Please try again in a moment.';
      detailPayload.code = 'RATE_LIMIT_ERROR';
      if (error?.data?.error?.message) {
          detailPayload.originalMessage = error.data.error.message;
      }
  }
  // Handle specific AI_NoSuchToolError
  else if (typeof error === 'object' && error !== null && 'toolName' in error && 'availableTools' in error && Array.isArray(error.availableTools)) {
    const toolName = error.toolName;
    const availableToolsString = error.availableTools.join(', ');
    response.error = `Model tried to call unavailable tool '${toolName}'.`;
    detailPayload.code = 'AI_NO_SUCH_TOOL';
    detailPayload.availableTools = availableToolsString;
  
  // Handle our structured UtilityError or similar patterns { error: true, message: ... }
  } else if (typeof error === 'object' && error !== null && error.error === true && error.message) {
    response.error = error.message;
    detailPayload.code = error.code || 'TOOL_ERROR';
    detailPayload.status = error.status; // Include status if present
    detailPayload.statusCode = error.statusCode; // Include statusCode if present
    // If details already exist in the incoming error, use them, otherwise null
    detailPayload.originalDetails = error.details || null; 
  
  // Handle standard Error objects
  } else if (error instanceof Error) {
    response.error = error.message;
    detailPayload.code = error.name === 'Error' ? 'GENERIC_ERROR' : error.name;
    detailPayload.stack = error.stack; // Include stack trace

  // Handle simple string errors
  } else if (typeof error === 'string') {
    response.error = error;
    detailPayload.code = 'STRING_ERROR';
  
  // Handle null/undefined errors
  } else if (error == null) {
    response.error = 'Unknown error (null or undefined received)';
    detailPayload.code = 'NULL_ERROR';
  
  // Fallback for other object types
  } else if (typeof error === 'object' && error !== null) {
     response.error = 'Received complex object error, see details.';
     detailPayload.code = 'COMPLEX_OBJECT_ERROR';
     // Attempt to serialize the original object into details
     try {
       detailPayload.originalError = JSON.parse(JSON.stringify(error)); // Deep copy attempt
     } catch (e) {
       detailPayload.originalError = 'Could not serialize complex error object.';
     }
  }

  // Stringify the collected details payload if it contains anything
  if (Object.keys(detailPayload).length > 0) {
      try {
        response.details = JSON.stringify(detailPayload);
      } catch (stringifyError) {
        console.error("Failed to stringify details payload:", stringifyError);
        response.details = JSON.stringify({ error: "Failed to serialize error details", code: "DETAILS_SERIALIZATION_ERROR" });
      }
  }

  // Always return a JSON string representing the ErrorResponse
  try {
    return JSON.stringify(response);
  } catch (stringifyError) {
    // Fallback if the final ErrorResponse itself cannot be stringified
    console.error("Failed to stringify the final ErrorResponse:", stringifyError);
    return JSON.stringify({ 
        success: false, 
        error: 'Fatal: Failed to serialize error response object', 
        code: 'RESPONSE_SERIALIZATION_ERROR' 
    });
  }
}

/**
 * Handle validation errors from Zod validation failures
 * @param error - The Zod validation error object.
 * @param toolName - The name of the tool where validation failed.
 * @returns A structured object suitable for error reporting (aligns closer to ErrorResponse).
 */
export function handleValidationError(error: any, toolName: string): ErrorResponse { 
  const validationMessages = error.errors?.map((e: any) => `${e.path.join('.')}: ${e.message}`).join('; ') || 'Invalid input structure';
  
  const detailsPayload = {
    tool: toolName,
    code: 'VALIDATION_ERROR',
    errors: error.errors // Include the raw Zod error details
  };

  return {
    success: false, 
    error: `Validation error in tool '${toolName}': ${validationMessages}`, 
    details: JSON.stringify(detailsPayload) // Stringify details payload
  };
} 