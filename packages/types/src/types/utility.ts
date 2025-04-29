/**
 * Types related to Utility.
 */
import { AgentServiceCredentials, ErrorResponse, ServiceResponse, SuccessResponse } from './common.js';
import { ExternalUtilityInfo } from './external-utility.js';
import { InternalUtilityInfo } from './internal-utility.js';

// --- Enums and Core Records ---

export enum UtilityProvider {
    AGENT_BASE = 'agent-base',
    CRISP = 'crisp',
    STRIPE = 'stripe',
    GMAIL = 'gmail',
    CHARGEBEE = 'chargebee',
    SLACK = 'slack',
}

export type PlatformApiKeySecretType = string;

export enum UtilityActionConfirmation {
    WEBHOOK_URL_INPUTED = 'webhook_url_inputed', // Represents user confirmation of an action
    OAUTH_DONE = 'oauth_done', // Represents user confirmation of an action
}

export enum UtilityInputSecret {
    WEBSITE_ID = 'website_id',
    API_SECRET_KEY = 'api_secret_key',
    API_PUBLISHABLE_KEY = 'api_publishable_key',
    API_IDENTIFIER = 'api_identifier',
}

export type UtilitySecretType = UtilityInputSecret | UtilityActionConfirmation | PlatformApiKeySecretType;

/**
 * UtilityToolCredentials Interface
 * Standard credentials required by all utility tools.
 */
export interface UtilityToolCredentials extends AgentServiceCredentials {
    conversationId: string;
  }

// export type SetupNeeded = UtilitySetupNeeded | WebhookSetupNeeded;

export interface SetupNeeded {
    needsSetup: true;
    utilityProvider: UtilityProvider;
    message: string; // General message
    title: string; // Title for UI prompt
    description: string; // Description for UI prompt
    requiredSecretInputs?: UtilityInputSecret[];     /** List of secret keys requiring user text input */
    requiredActionConfirmations?: UtilityActionConfirmation[];    /** List of secrets representing actions that require user confirmation */
    // For webhook url to input
    webhookUrlToInput?: string; // Webhook URL to input in the provider dashboard
    // For oauth to do
    oauthUrl?: string; // For OAuth flow initiation
}

// /**
//  * Standardized response when setup (OAuth, secrets, actions) is needed.
//  */
// export interface UtilitySetupNeeded extends SetupNeededCore {
//     setupType: 'utility';
//     utilityProvider: UtilityProvider;
//     oauthProvider?: OAuthProvider;
//     buttonText?: string; // Suggested main action button text
//     requiredOauth?: string; // For OAuth flow initiation
// }
// /**
//  * Standardized response when setup (OAuth, secrets, actions) is needed.
//  */
// export interface WebhookSetupNeeded extends SetupNeededCore {
//     setupType: 'webhook';
//     webhookProviderId: WebhookProviderId;
//     webhookUrlToInput?: string; // Webhook URL to input in the provider dashboard
//   }


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