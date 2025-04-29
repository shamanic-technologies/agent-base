import {
    SetupNeeded,

 } from "./utility.js";
import {InternalUtilityTool, InternalUtilityInfo } from "./internal-utility.js";
import {OAuthProvider} from "./oauth.js";
import { SuccessResponse, ErrorResponse, ServiceResponse } from "./common.js";
import { UtilityProvider, UtilityInputSecret, UtilitySecretType, UtilityActionConfirmation } from "./utility.js";


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
 * Configuration structure for an external utility tool.
 * Drives the generic execution engine.
 */
export interface ExternalUtilityTool extends InternalUtilityTool{
    utilityProvider: UtilityProvider;     /** The provider enum (e.g., UtilityProvider.GMAIL) */
    authMethod: AuthMethod;    /** Authentication method required */
    requiredSecrets: UtilitySecretType[];     /** Secrets required from secret-service (includes action confirmations like WEBHOOK_URL_INPUTED) */
    requiredScopes?: string[];     /** OAuth scopes required (only if authMethod is OAUTH) */
    
    apiKeyDetails?: {     /** Details on how to use the API key (only if authMethod is API_KEY) */
        secretName: UtilitySecretType; // Which secret holds the key
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
 * Represents any possible valid response from executing an external utility
 */
export type ExternalUtilityExecutionResponse =
    SuccessResponse<SetupNeeded> |
    ErrorResponse |
    SuccessResponse<any>;

  // Update ExternalUtilityInfo to use the new schema type definition
export interface ExternalUtilityInfo extends InternalUtilityInfo {
    utilityProvider: UtilityProvider;
    authMethod: AuthMethod;
    requiredSecrets: UtilitySecretType[];
    requiredScopes?: string[];
    apiKeyDetails?: {
        secretName: UtilitySecretType; // Which secret holds the key
        scheme: ApiKeyAuthScheme;
        headerName?: string;      // Required only if scheme is HEADER
    };
    apiDetails?: {
        method: HttpMethod;
        baseUrl: string;           // Base URL (e.g., 'https://api.stripe.com/v1')
        pathTemplate: string;      // Path with {placeholders} (e.g., '/customers/{customerId}')
    };
};



/**
 * Maps a UtilityProvider to an OAuthProvider
 */
export function mapUtilityProviderToOAuthProvider(utilityProvider: UtilityProvider): OAuthProvider {
    switch (utilityProvider) {
        case UtilityProvider.GMAIL:
            return OAuthProvider.GOOGLE;
        default:
            throw new Error(`Unsupported utility provider: ${utilityProvider}`);
    }
};
