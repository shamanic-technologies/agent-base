/**
 * Type definitions for Utility Tool Service
 */

/**
 * Standard interface for all utility tools in the system
 */
export interface UtilityTool {
  /** Unique identifier for the utility */
  id: string;
  /** Human-readable description of what the utility does */
  description: string;
  /** Schema defining the input parameters for the utility */
  schema: Record<string, {
    type: string;
    optional?: boolean;
    description?: string;
  }>;
  /**
   * The execution function for the utility
   * @param userId ID of the user making the request
   * @param conversationId ID of the conversation context
   * @param params Input parameters for the utility
   * @param agentId ID of the agent making the request
   * @returns Result of the utility execution
   */
  execute: (userId: string, conversationId: string, params: any, agentId?: string) => Promise<any>;
}

/**
 * Standardized error response structure for all utility tools
 */
export interface UtilityErrorResponse {
  status: 'error';
  error: string;
  details?: string;
}

/**
 * Core request structure
 */
export interface UtilityRequest {
  operation?: string;
  input?: any;
  conversation_id: string;
  redirect_url?: string;
}

/**
 * Standardized auth needed response for all providers
 */
export interface SetupNeededResponse {
  status: 'success';
  data: {
    needs_setup: true;
    setup_url: string;
    provider: string;
    message: string;
    title: string;
    description: string;
    button_text: string;
  }
}

/**
 * UtilityInfo, UtilitiesListResponse, UtilityInfoResponse
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
