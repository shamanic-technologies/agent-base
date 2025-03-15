/**
 * Type definitions for Utility Service
 */

// Request/response types for utility operations
export interface UtilityRequest {
  operation: string;
  data?: any;
}

export interface UtilityResponse {
  message?: string;
  data?: any;
  timestamp?: string;
  error?: string;
  details?: string;
}

// Supported utility operations
export type UtilityOperation = 'echo' | 'timestamp'; 