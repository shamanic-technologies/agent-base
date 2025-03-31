/**
 * Types
 * 
 * Type definitions for the logging service.
 */

/**
 * Interface for API call log entry
 * Simple logging of incoming requests with essential information
 */
export interface ApiLogEntry {
  id: string;
  user_id: string;
  api_key: string;
  endpoint: string;
  method: string;
  ip_address?: string;
  user_agent?: string;
  request_id?: string;
  request_body?: any;
  conversation_id?: string;
  timestamp: string;
}

/**
 * Interface for database API log entry
 * Extends ApiLogEntry with database-specific fields
 */
export interface DatabaseApiLogEntry extends ApiLogEntry {
  created_at: string;
  updated_at: string;
}

