/**
 * Common base types for the agent system.
 */

/**
 * Generic success/error response structure.
 */
export interface BaseResponse {
  success: boolean;
  error?: string;
} 