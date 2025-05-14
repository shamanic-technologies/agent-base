import {
    SetupNeeded,
    UtilityProviderEnum,
} from "./utility.js";
import { InternalUtilityInfo } from "./internal-utility.js";
import { OAuthProvider } from "./oauth.js";
import { SuccessResponse, ErrorResponse } from "./common.js";
import { UtilityProvider, UtilitySecretType } from "./utility.js";
import type { OpenAPIObject, SecuritySchemeObject } from 'openapi3-ts/oas30';
import type { JSONSchema7 } from 'json-schema';


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
    utilityProvider: UtilityProvider;

    /**
     * An OpenAPI Specification object (or a self-contained fragment focusing on a single operation)
     * that describes the external API this tool interacts with.
     *
     * For execution by api-tool-backend, it's expected that:
     * 1. The `paths` object within this spec should ideally contain a single path string as a key
     *    (e.g., "/users/{id}").
     * 2. That path item object (the value for the path string) should ideally contain a single
     *    HTTP method as a key (e.g., "get", "post").
     * 3. The operation object at `openapiSpec.paths[pathString][methodString]` is what will be executed.
     *    This OperationObject contains parameters, requestBody, responses, and security requirements.
     * 4. Security schemes referenced in the operation's `security` field must be defined in
     *    `openapiSpec.components.securitySchemes`, including the necessary `x-shamanic-*` extensions
     *    for mapping to internal secret names from your secret-service.
     * 5. The `servers` array in `openapiSpec` (if present and unambiguous for the operation)
     *    can be used to determine the base URL. Otherwise, a default or fallback mechanism
     *    might be needed in api-tool-backend if not specified or ambiguous.
     */
    openapiSpecification: OpenAPIObject; // The OpenAPI specification fragment for the external API
    securityOption: string; // The key of the security scheme to use for the operation
    securitySecrets: { // The secrets to use for the operation
        "x-secret-name": UtilitySecretType,
        "x-secret-username": UtilitySecretType,
        "x-secret-password": UtilitySecretType,
     };
}

/**
 * Represents any possible valid response from executing an external utility
 */
export type ApiToolExecutionResponse =
    SuccessResponse<SetupNeeded> |
    ErrorResponse |
    SuccessResponse<unknown>;

export interface ApiToolInfo extends InternalUtilityInfo {
    name: string;
    utilityProvider: UtilityProvider;
    // The 'schema: JSONSchema7' inherited from InternalUtilityInfo will be
    // derived by api-tool-backend from the single OperationObject found within ApiTool.openapiSpec.paths.
}

/**
 * Maps a UtilityProvider to an OAuthProvider
 */
export function mapUtilityProviderToOAuthProvider(utilityProvider: UtilityProvider): OAuthProvider {
    switch (utilityProvider) {
        case UtilityProviderEnum.GMAIL:
            return OAuthProvider.GOOGLE;
        default:
            console.warn(`No direct OAuthProvider mapping for UtilityProvider: ${utilityProvider}. This is fine if the tool uses another auth method or defines OAuth via OpenAPI components.`);
            throw new Error(`OAuthProvider mapping not defined for UtilityProvider: ${utilityProvider}. Define in OpenAPI components or add a case here if direct mapping is intended.`);
    }
}
