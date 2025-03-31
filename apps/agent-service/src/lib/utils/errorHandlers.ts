/**
 * Error Handlers for Vercel AI SDK Backend
 * 
 * Utilities for handling different types of errors in the agent service
 * Following Vercel AI SDK documentation patterns
 */

import { UtilityError } from '../../types/index.js';
import axios from 'axios';

/**
 * Handle errors from Axios API calls
 */
export function handleAxiosError(error: any, apiUrl: string = 'API'): UtilityError {
  if (axios.isAxiosError(error)) {
    // Handle network errors or API errors
    if (!error.response) {
      return {
        error: true,
        message: `Network error: Failed to connect to ${apiUrl}`,
        status: 'error',
        code: 'NETWORK_ERROR'
      };
    }
    
    return {
      error: true,
      message: error.response.data?.error || error.message,
      status: 'error',
      code: 'API_ERROR',
      statusCode: error.response.status
    };
  }
  
  // Generic error
  return {
    error: true,
    message: error instanceof Error ? error.message : String(error),
    status: 'error',
    code: 'UNKNOWN_ERROR'
  };
}

/**
 * Handle tool errors for AI SDK
 * Format according to Vercel AI SDK error protocol
 */
export function handleToolError(error: any): any {
  console.error(`[Tool Error] Error executing tool:`, error);
  
  let errorMessage: string;
  let errorCode: string = 'TOOL_ERROR';
  
  // Extract error message from various error types
  if (typeof error === 'string') {
    errorMessage = error;
  } else if (error instanceof Error) {
    errorMessage = error.message;
    errorCode = error.name || errorCode;
  } else if (typeof error === 'object' && error !== null) {
    errorMessage = error.message || error.error || JSON.stringify(error);
    errorCode = error.code || error.status || errorCode;
  } else {
    errorMessage = String(error);
  }
  
  // Format error according to Vercel AI SDK stream protocol
  return {
    type: 'error',
    error: {
      message: errorMessage,
      code: errorCode,
      details: `Tool failed with error: ${errorMessage}`
    }
  };
}

/**
 * Handle validation errors from Zod validation failures
 */
export function handleValidationError(error: any, toolName: string): any {
  // Format validation errors using the same protocol
  return {
    type: 'error',
    error: {
      message: `Validation error in ${toolName}: ${error.errors?.map((e: any) => e.message).join(', ') || 'Invalid input'}`,
      code: 'VALIDATION_ERROR',
      toolName: toolName,
      details: `Tool ${toolName} validation failed`
    }
  };
} 