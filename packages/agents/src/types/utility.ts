/**
 * Types related to Utility.
 */
import { BaseResponse, ErrorResponse } from './common.js';

// --- Enums and Core Records ---

export enum UtilityProvider {
    CRISP = 'crisp',
    STRIPE = 'stripe',
    GMAIL = 'gmail',
    CHARGEBEE = 'chargebee',
    SLACK = 'slack',
}

export enum UtilitySecret {
    WEBSITE_ID = 'website_id',
    API_SECRET_KEY = 'api_secret_key',
    API_PUBLISHABLE_KEY = 'api_publishable_key',
    API_IDENTIFIER = 'api_identifier',
    WEBHOOK_URL_INPUTED = 'webhook_url_inputed', // Represents user confirmation of an action
}

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

/**
 * Schema definition for a single parameter within ExternalUtilityConfig
 */
export interface ExternalUtilityParamSchema {
    /** Simplified type indicator for basic validation and UI hints */
    type: 'string' | 'number' | 'boolean' | 'array_string' | 'object';

    /** Is the parameter required? */
    required: boolean;

    /** Human-readable description for LLM/UI */
    description: string;
    examples?: any[];
}

/**
 * Configuration structure for an external utility tool.
 * Drives the generic execution engine.
 */
export interface ExternalUtilityConfig {
    /** Unique identifier (e.g., 'utility_gmail_read') */
    id: string;

    /** The provider enum (e.g., UtilityProvider.GMAIL) */
    provider: UtilityProvider;

    /** Human-readable description for LLM and UI */
    description: string;

    /** Schema defining input parameters */
    schema: Record<string, ExternalUtilityParamSchema>;

    /** Authentication method required */
    authMethod: AuthMethod;

    /** Secrets required from secret-service (includes action confirmations like WEBHOOK_URL_INPUTED) */
    requiredSecrets: UtilitySecret[];

    /** OAuth scopes required (only if authMethod is OAUTH) */
    requiredScopes?: string[];

    /** Details on how to use the API key (only if authMethod is API_KEY) */
    apiKeyDetails?: {
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
    setup_url?: string; // For OAuth flow initiation
    provider: string;
    message: string; // General message
    title: string; // Title for UI prompt
    description: string; // Description for UI prompt
    button_text?: string; // Suggested main action button text

    /** List of secret keys requiring user text input */
    required_secret_inputs?: UtilitySecret[];

    /** List of secrets representing actions that require user confirmation */
    required_action_confirmations?: UtilitySecret[];
}

export interface SetupNeededResponse extends BaseResponse {
    success: true; // Still considered 'success' from the service perspective
    data: SetupNeededData;
    error?: never;
}


/**
 * Standardized error response for utility execution failures.
 */
export interface UtilityErrorResponse extends ErrorResponse {
    // Inherits success: false, error: string from ErrorResponse
    // Can add utility-specific error fields if needed later
}

/**
 * Generic success response for utility execution
 */
export interface UtilitySuccessResponse<T = any> extends BaseResponse {
    success: true;
    data: T; // The actual result from the external API or process
    error?: never;
}

/**
 * Represents any possible valid response from executing an external utility
 */
export type ExternalUtilityExecutionResponse =
    SetupNeededResponse |
    UtilitySuccessResponse |
    UtilityErrorResponse;
  

