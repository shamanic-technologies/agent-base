/**
 * Types related to Utility.
 */
import { ErrorResponse, ServiceResponse, SuccessResponse } from './common.js';

// --- Enums and Core Records ---

export enum UtilityProvider {
    CRISP = 'crisp',
    STRIPE = 'stripe',
    GMAIL = 'gmail',
    CHARGEBEE = 'chargebee',
    SLACK = 'slack',
}

export enum UtilityActionConfirmation {
    WEBHOOK_URL_INPUTED = 'webhook_url_inputed', // Represents user confirmation of an action
}

export enum UtilityInputSecret {
    WEBSITE_ID = 'website_id',
    API_SECRET_KEY = 'api_secret_key',
    API_PUBLISHABLE_KEY = 'api_publishable_key',
    API_IDENTIFIER = 'api_identifier',
}

export type UtilitySecret = UtilityInputSecret | UtilityActionConfirmation;

/**
 * Standard HTTP methods
 */
export enum HttpMethod {
    GET = 'GET',
    POST = 'POST',
    PUT = 'PUT',
    DELETE = 'DELETE',
    PATCH = 'PATCH'
}

/**
 * Standard Authentication methods for external tools
 */
export enum AuthMethod {
    OAUTH = 'OAUTH',    // Requires OAuth flow via tool-auth-service
    API_KEY = 'API_KEY', // Requires API key(s) stored via secret-service
    NONE = 'NONE'       // No authentication needed
}

/**
 * How an API key is presented in the request
 */
export enum ApiKeyAuthScheme {
    BEARER = 'Bearer',          // Authorization: Bearer <key>
    BASIC_USER = 'BasicUser',   // Basic Auth: username=<key>, password=
    BASIC_PASS = 'BasicPass',   // Basic Auth: username=, password=<key>
    HEADER = 'Header'           // Custom Header: <headerName>: <key>
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
   * Standard interface for all utility tools in the system
   */
export interface InternalUtilityTool {
    id: string;   /** Unique identifier for the utility */
    description: string;  /** Human-readable description of what the utility does */
    schema: Record<string, JsonSchema>; // Schema defining the input parameters for the utility
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
 * Configuration structure for an external utility tool.
 * Drives the generic execution engine.
 */
export interface ExternalUtilityTool extends InternalUtilityTool{
    provider: UtilityProvider;     /** The provider enum (e.g., UtilityProvider.GMAIL) */
    authMethod: AuthMethod;    /** Authentication method required */
    requiredSecrets: UtilitySecret[];     /** Secrets required from secret-service (includes action confirmations like WEBHOOK_URL_INPUTED) */
    requiredScopes?: string[];     /** OAuth scopes required (only if authMethod is OAUTH) */
    
    apiKeyDetails?: {     /** Details on how to use the API key (only if authMethod is API_KEY) */
        secretName: UtilitySecret; // Which secret holds the key
        scheme: ApiKeyAuthScheme;
        headerName?: string;      // Required only if scheme is HEADER
    };

    /** Details for making the actual API call (Optional - some tools might only check prerequisites) */
    apiDetails?: {
        method: HttpMethod;
        baseUrl: string;           // Base URL (e.g., 'https://api.stripe.com/v1')
        pathTemplate: string;      // Path with {placeholders} (e.g., '/customers/{customerId}')

        /** Mapping input schema keys to API request parts */
        paramMappings?: {
            path?: Record<string, string>;   // { schemaKey: 'placeholderName' }
            query?: Record<string, string | { target: string, transform: 'joinComma' }>; // { schemaKey: 'queryParamName' } or transformation
            body?: Record<string, string>;   // { schemaKey: 'bodyFieldName' } (assumes JSON body)
        };
        staticHeaders?: Record<string, string>; // e.g., { 'Content-Type': 'application/json' }
    };
}

/**
 * Standardized response when setup (OAuth, secrets, actions) is needed.
 */
export interface SetupNeededData {
    needs_setup: true;
    provider: string;
    message: string; // General message
    title: string; // Title for UI prompt
    description: string; // Description for UI prompt
    button_text?: string; // Suggested main action button text
    required_secret_inputs?: UtilityInputSecret[];     /** List of secret keys requiring user text input */
    required_action_confirmations?: UtilityActionConfirmation[];    /** List of secrets representing actions that require user confirmation */
    required_oauth?: string; // For OAuth flow initiation
}

/**
 * Represents any possible valid response from executing an external utility
 */
export type ExternalUtilityExecutionResponse =
    SuccessResponse<SetupNeededData> |
    ErrorResponse |
    SuccessResponse<any>;

  
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
   * UtilityInfo, UtilitiesListResponse, UtilityInfoResponse
   */
  export interface InternalUtilityInfo {
    id: string;
    description: string;
    schema: Record<string, JsonSchema>;
  };

  export type InternalUtilityInfoResponse = ServiceResponse<InternalUtilityInfo>;

  // Update ExternalUtilityInfo to use the new schema type definition
  export interface ExternalUtilityInfo extends InternalUtilityInfo {
    provider: UtilityProvider;
    authMethod: AuthMethod;
    requiredSecrets: UtilitySecret[];
    requiredScopes?: string[];
    apiKeyDetails?: {
        secretName: UtilitySecret; // Which secret holds the key
        scheme: ApiKeyAuthScheme;
        headerName?: string;      // Required only if scheme is HEADER
    };
    apiDetails?: {
        method: HttpMethod;
        baseUrl: string;           // Base URL (e.g., 'https://api.stripe.com/v1')
        pathTemplate: string;      // Path with {placeholders} (e.g., '/customers/{customerId}')
    };
    // Re-declare schema here to ensure the override uses the updated UtilityToolParamSchema
    schema: Record<string, JsonSchema>; 
  };

export type ExternalUtilityInfoResponse = ServiceResponse<ExternalUtilityInfo>;


export type UtilityInfoResponse = InternalUtilityInfoResponse | ExternalUtilityInfoResponse;
export type UtilityInfo = InternalUtilityInfo | ExternalUtilityInfo;

export type UtilitiesListItem = {
    id: string;
    description: string;
}

export type UtilitiesList =  UtilitiesListItem[];

export type UtilitiesListResponse = ServiceResponse<UtilitiesList>;

