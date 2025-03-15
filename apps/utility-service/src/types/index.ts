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
export type UtilityOperation = 'utility_get_current_datetime';

// Required types for the utility_get_current_datetime function
export type ThreadId = string;
export type NodeId = string;
export type ParentNodeId = string | null;

export enum NodeType {
  AGENT = "agent",
  TOOL = "tool",
  UTILITY = "utility"
}

export type ParentNodeType = NodeType | null;

export interface DateTimeRequest {
  format?: string;
}

/**
 * Add these types after the existing utility operation types
 */

export type UtilityInfo = {
  id: string;
  description: string;
  schema: Record<string, {
    type: string;
    optional?: boolean;
    description?: string;
  }>;
};

export type UtilitiesListResponse = {
  utilities: string[];
};

export type UtilityInfoResponse = UtilityInfo | {
  error: string;
}; 