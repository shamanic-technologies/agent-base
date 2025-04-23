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
 * Formats an error into a simple string message suitable for stream piping responses.
 */
export function handleToolError(error: any): string {
  console.error(`[Tool Error] Formatting error for stream pipe:`, error);

  // Check specifically for AI_NoSuchToolError structure (based on observed properties)
  if (typeof error === 'object' && error !== null && 'toolName' in error && 'availableTools' in error && Array.isArray(error.availableTools)) {
    const toolName = error.toolName;
    const availableToolsString = error.availableTools.join(', ');
    return `Model tried to call unavailable tool '${toolName}'. Available tools: ${availableToolsString}.`;
  }

  if (error == null) return 'unknown error';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  // Check for our structured error format { error: { message: '...' } }
  if (typeof error === 'object' && error?.error?.message) return error.error.message;
  
  // Fallback: attempt to stringify, handle if it fails
  try {
    return JSON.stringify(error);
  } catch {
    return 'unserializable error object';
  }
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