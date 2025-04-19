/**
 * Types related to Utility.
 */
import { AgentServiceCredentials, ErrorResponse, ServiceResponse, SuccessResponse } from './common.js';
import { ExternalUtilityInfo } from './external-utility.js';
import { InternalUtilityInfo } from './internal-utility.js';
import { OAuthProvider } from './oauth.js';

// --- Enums and Core Records ---
/**
 * UtilityToolCredentials Interface
 * Standard credentials required by all utility tools.
 */
export interface UtilityToolCredentials extends AgentServiceCredentials {
    conversationId: string;
  }

// Update UtilityToolParamSchema to represent a JSON Schema object
// Using a basic type for now, can be refined with more specific JSON Schema types if needed
export type JsonSchema = Record<string, any> & { 
    type?: string | string[];
    properties?: Record<string, JsonSchema>;
    items?: JsonSchema | JsonSchema[];
    required?: string[];
    description?: string;
    examples?: any[];
    // Add other common JSON Schema keywords as needed
};
  
  /**
   * Core request structure
   */
export interface UtilityRequest {
    operation?: string;
    input?: any;
    conversation_id: string;
    redirect_url?: string;
}

export type UtilitiesListItem = {
    id: string;
    description: string;
}

export type UtilitiesList =  UtilitiesListItem[];

export type UtilitiesListResponse = ServiceResponse<UtilitiesList>;
export type UtilityInfo = InternalUtilityInfo | ExternalUtilityInfo;

/**
 * Payload for executing an external tool.
 */
export interface ExecuteToolPayload {
    conversationId: string;
    params: Record<string, unknown>; // Use unknown for better type safety than any
}

/**
 * Response from executing an external tool.
 */
export interface ExecuteToolResult {
    result: any; // Define based on expected tool outputs
}

/**
 * Type definition for the structure expected within the data field 
 * of the ServiceResponse for the list utilities endpoint.
 */
export type ListUtilities = {
    count: number;
    utilities: UtilitiesList; // UtilitiesList is UtilityInfo[]
};