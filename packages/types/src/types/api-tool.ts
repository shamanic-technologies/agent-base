import {
    SetupNeeded,
    UtilityInputSecret,
    UtilityProviderEnum,
} from "./utility.js";
import { InternalUtilityInfo } from "./internal-utility.js";
import { OAuthProvider } from "./oauth.js";
import { SuccessResponse, ErrorResponse } from "./common.js";
import { UtilityProvider, UtilitySecretType } from "./utility.js";
import type { OpenAPIObject, SecuritySchemeObject } from 'openapi3-ts/oas30';
import type { JSONSchema7 } from 'json-schema';

export enum ApiToolStatus {
    UNSET = 'unset',
    ACTIVE = 'active',
    DISABLED = 'disabled', // To be implemented later
    DELETED = 'deleted',
}

export interface UserApiTool {
    userId: string;
    apiToolId: string;
    status: ApiToolStatus;
    createdAt: Date;
    updatedAt: Date;
}

export interface ApiToolData {
    utilityProvider: UtilityProvider;
    openapiSpecification: OpenAPIObject;
    securityOption: string;
    securitySecrets: { // The secrets to use for the operation
        "x-secret-name": UtilityInputSecret,
        "x-secret-username": UtilityInputSecret,
        "x-secret-password": UtilityInputSecret,
     };
    isVerified: boolean;
    creatorUserId?: string;
    }

export type CreateApiToolRequest = ApiToolData;
/**
 * Configuration structure for an external utility tool.
 * Drives the generic execution engine.
 */
export interface ApiTool extends ApiToolData {
    id: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ApiToolExecution {
    id: string;
    apiToolId: string;
    userId: string;
    input: any;
    output: any;
    statusCode: number;
    error?: string;
    errorDetails?: string;
    hint?: string;
    createdAt: Date;
    updatedAt: Date;
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
