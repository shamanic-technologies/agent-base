import {
    SetupNeeded,

 } from "./utility.js";
import {InternalUtilityTool, InternalUtilityInfo } from "./internal-utility.js";
import {OAuthProvider} from "./oauth.js";
import { SuccessResponse, ErrorResponse, ServiceResponse } from "./common.js";
import { UtilityProvider, UtilityInputSecret, UtilitySecretType, UtilityActionConfirmation } from "./utility.js";
// Add imports for OpenAPI types
import type { OperationObject, SecuritySchemeObject } from 'openapi3-ts/oas30'; // Using oas30 for broader compatibility for now


// /**
//  * Standard HTTP methods
//  */
// export enum HttpMethod {
//     GET = 'GET',
//     POST = 'POST',
//     PUT = 'PUT',
//     DELETE = 'DELETE',
//     PATCH = 'PATCH'
// }

// /**
//  * Standard Authentication methods for external tools
//  */
// export enum AuthMethod {
//     OAUTH = 'OAUTH',    // Requires OAuth flow via tool-auth-service
//     API_KEY = 'API_KEY', // Requires API key(s) stored via secret-service
//     NONE = 'NONE'       // No authentication needed
// }

// /**
//  * How an API key is presented in the request
//  */
// export enum ApiKeyAuthScheme {
//     BEARER = 'Bearer',          // Authorization: Bearer <key>
//     BASIC_USER = 'BasicUser',   // Basic Auth: username=<key>, password=
//     BASIC_PASS = 'BasicPass',   // Basic Auth: username=, password=<key>
//     BASIC_USER_PASS = 'BasicUserPass', // Basic Auth: username=<identifier_secret>, password=<key_secret>
//     HEADER = 'Header'           // Custom Header: <headerName>: <key>
// }


/**
 * Configuration structure for an external utility tool.
 * Drives the generic execution engine.
 */
export interface ApiTool {
    id: string;
    utilityProvider: UtilityProvider;     /** The provider enum (e.g., UtilityProvider.GMAIL) */
    // requiredSecrets: UtilitySecretType[];     /** General secrets required (includes action confirmations like WEBHOOK_URL_INPUTED). For auth secrets, prefer mapping via openapiSecuritySchemes if using OpenAPI spec. */
    
    // --- OpenAPI Specification (Preferred Method) ---
    /** Describes the target API endpoint using an OpenAPI Operation Object. 
     *  This object contains details about the HTTP method, path, parameters (path, query, header, cookie),
     *  request body, responses, and security requirements for the specific API call.
     */
    openapiOperation?: OperationObject;
    /** 
     * Maps security scheme names (referenced in `openapiOperation.security`) to their full SecuritySchemeObject definitions.
     * Includes custom 'x-shamanic-*' extensions within each scheme definition to map to internal secret names from the secret-service.
     * Example: `openapiSecuritySchemes: { "MyBasicAuth": { type: "http", scheme: "basic", "x-shamanic-username-secret-name": "my_user_secret", "x-shamanic-password-secret-name": "my_pass_secret" } }`
     */
    openapiSecuritySchemes?: Record<string, SecuritySchemeObject & {
        'x-shamanic-secret-name'?: UtilitySecretType; // For single-value secrets like a Bearer token or an API key in a header. The value is the name of the secret in secret-service.
        'x-shamanic-username-secret-name'?: UtilitySecretType; // For the username part of Basic Auth. The value is the name of the secret in secret-service.
        'x-shamanic-password-secret-name'?: UtilitySecretType; // For the password part of Basic Auth. The value is the name of the secret in secret-service.
        // Add other 'x-shamanic-*' mappings if needed for other credential parts (e.g., OAuth client_id secret name if storing client_id as a secret)
    }>;

    // --- Legacy/Alternative Configuration (Will be removed in the future) ---
    // /** @deprecated Prefer openapiOperation and openapiSecuritySchemes. Authentication method required. */
    // authMethod?: AuthMethod;    
    // /** @deprecated Prefer openapiOperation and openapiSecuritySchemes. OAuth scopes required. */
    // requiredScopes?: string[];     
    // /** @deprecated Prefer openapiOperation and openapiSecuritySchemes. Details on how to use the API key. */
    // apiKeyDetails?: {     
    //     secretName: UtilitySecretType; 
    //     scheme: ApiKeyAuthScheme;
    //     identifierSecretName?: UtilitySecretType; // Only for BASIC_USER_PASS if username comes from a different secret
    //     headerName?: string;      
    // };
    // /** @deprecated Prefer openapiOperation. Details for making the actual API call. */
    // apiDetails?: {
    //     method: HttpMethod;
    //     baseUrl: string;          
    //     pathTemplate: string;      
    //     paramMappings?: {
    //         path?: Record<string, string>;   
    //         query?: Record<string, string | { target: string, transform: 'joinComma' }>; 
    //         body?: Record<string, string>;   
    //     };
    //     staticHeaders?: Record<string, string>; 
    // };
}



/**
 * Represents any possible valid response from executing an external utility
 */
export type ApiToolExecutionResponse =
    SuccessResponse<SetupNeeded> |
    ErrorResponse |
    SuccessResponse<any>;

export interface ApiToolInfo extends InternalUtilityInfo {
    utilityProvider: UtilityProvider;
    // OpenAPI fields
    openapiOperation?: OperationObject;
    openapiSecuritySchemes?: Record<string, SecuritySchemeObject & {
        'x-shamanic-secret-name'?: UtilitySecretType;
        'x-shamanic-username-secret-name'?: UtilitySecretType;
        'x-shamanic-password-secret-name'?: UtilitySecretType;
    }>;

    // Legacy fields (Will be removed in the future)
    // /** @deprecated */
    // authMethod?: AuthMethod;
    // requiredSecrets: UtilitySecretType[]; // Keep this for general non-auth secrets or if not using openapiSecuritySchemes fully
    // /** @deprecated */
    // requiredScopes?: string[];
    // /** @deprecated */
    // apiKeyDetails?: {
    //     secretName: UtilitySecretType; 
    //     scheme: ApiKeyAuthScheme;
    //     identifierSecretName?: UtilitySecretType;
    //     headerName?: string;      
    // };
    // /** @deprecated */
    // apiDetails?: {
    //     method: HttpMethod;
    //     baseUrl: string;          
    //     pathTemplate: string;      
    // };
};



/**
 * Maps a UtilityProvider to an OAuthProvider
 */
export function mapUtilityProviderToOAuthProvider(utilityProvider: UtilityProvider): OAuthProvider {
    switch (utilityProvider) {
        case UtilityProvider.GMAIL:
            return OAuthProvider.GOOGLE;
        // Add other mappings as needed for OAuth-enabled providers
        // case UtilityProvider.CRISP:
            // return OAuthProvider.CRISP; // Example if Crisp had OAuth
        default:
            // Consider if this should throw an error or return a default/undefined
            // For now, let's assume not all utility providers support OAuth directly mapped this way
            // and an error might be too strict if the tool uses a different auth method.
            console.warn(`No direct OAuthProvider mapping for UtilityProvider: ${utilityProvider}. This is fine if the tool uses another auth method.`);
            // Return a placeholder or handle as per your OAuth flow design for non-explicitly mapped providers.
            // For this example, let's throw to indicate a missing explicit mapping if OAuth is expected.
            throw new Error(`OAuthProvider mapping not defined for UtilityProvider: ${utilityProvider}. Please define it if this provider uses OAuth.`);
    }
};
