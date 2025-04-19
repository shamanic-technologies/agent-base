/**
 * Types related to Utility.
 */
import { ErrorResponse, ServiceResponse, SuccessResponse } from './common.js';
import { OAuthProvider } from './oauth.js';

// --- Enums and Core Records ---

export enum UtilityProvider {
    CRISP = 'crisp',
    STRIPE = 'stripe',
    GMAIL = 'gmail',
    CHARGEBEE = 'chargebee',
    SLACK = 'slack',
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

