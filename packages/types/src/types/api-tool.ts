import {
    SetupNeeded,
    UtilityInputSecret,
    UtilityProviderEnum,
} from "./utility.js";
import { InternalUtilityInfo } from "./internal-utility.js";
import { OAuthProvider } from "./oauth.js";
import { SuccessResponse, ErrorResponse } from "./common.js";
import { UtilityProvider } from "./utility.js";
import type { OpenAPIObject } from 'openapi3-ts/oas30';
import { ExecuteToolResult } from "./utility.js";


// Api Tool Object: the object stored in the database for each api tool
export interface ApiToolData {
    utilityProvider: UtilityProvider;
    name: string;
    description: string;
    openapiSpecification: OpenAPIObject;
    securityOption: string;
    securitySecrets: { // The secrets to use for the operation
        "x-secret-name": UtilityInputSecret,
        "x-secret-username": UtilityInputSecret,
        "x-secret-password": UtilityInputSecret,
     };
    isVerified: boolean;
    creatorUserId?: string;
    creatorOrganizationId?: string;
}

/**
 * Configuration structure for an external utility tool.
 * Drives the generic execution engine.
 */
export interface ApiTool extends ApiToolData {
    id: string;
    createdAt?: Date;
    updatedAt?: Date;
}

// Creating an api tool
export type CreateApiToolRequest = ApiToolData;
export type CreateApiToolResult = ApiTool;

// Executing an Api Tool
export type ApiToolExecutionResult = SetupNeeded | ExecuteToolResult;

// Calling detailed info of an api tool
export interface ApiToolInfo extends InternalUtilityInfo {
    name: string;
    utilityProvider: UtilityProvider;
}

// Searching for an api tool
export interface SearchApiToolResultItem {
    // Api Tool Info
    name: string;
    description: string;
    apiToolId: string;
    utilityProvider: UtilityProvider;
    securityOption: string;
    isVerified: boolean;
    creatorUserId?: string;
    creatorOrganizationId?: string;
    // User info
    userId: string;
    status: ApiToolStatus;
    // Execution info
    totalExecutions: number;
    succeededExecutions: number;
    failedExecutions: number;
    createdAt: Date;
    updatedAt: Date;
}
  
export interface SearchApiToolResult {
    items: SearchApiToolResultItem[];
    total: number;
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

// User Api Tool Object: the relation between a user and an api tool
export enum ApiToolStatus {
    UNSET = 'unset',
    ACTIVE = 'active',
    DISABLED = 'disabled', // To be implemented later
    DELETED = 'deleted',
}

export interface UserApiTool {
    userId: string;
    organizationId: string;
    apiToolId: string;
    status: ApiToolStatus;
    createdAt: Date;
    updatedAt: Date;
}

// Api Tool Exectution object: the object stored in the database for each execution
export interface ApiToolExecutionData {
    apiToolId: string;
    userId: string;
    organizationId: string;
    input: any;
    output: any;
    statusCode: number;
    error?: string;
    errorDetails?: string;
    hint?: string;
}

export interface ApiToolExecution extends ApiToolExecutionData {
    id: string;
    apiToolId: string;
    userId: string;
    organizationId: string;
    input: any;
    output: any;
    statusCode: number;
    error?: string;
    errorDetails?: string;
    hint?: string;
    createdAt: Date;
    updatedAt: Date;
}
