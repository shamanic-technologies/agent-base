/**
 * Types
 * 
 * Type definitions for the logging service.
 */

/**
 * Interface for API call log entry
 * Note: userId is required but should be provided via X-USER-ID header
 * rather than in the request body for proper authentication
 */
export interface ApiLogEntry {
  id?: string;
  apiKey?: string;
  userId: string;  // Required user_id field, passed via X-USER-ID header
  endpoint: string;
  method: string;
  statusCode?: number;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  requestBody?: any;
  responseBody?: any;
  durationMs?: number;
  errorMessage?: string;
  timestamp?: string;
  price?: number;  // Field for pricing
  inputTokens?: number; // Total input tokens
  outputTokens?: number; // Total output tokens
} 