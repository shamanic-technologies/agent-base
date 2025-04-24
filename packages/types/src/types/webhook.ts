
/**
 * Types for webhook integrations
 */
import { JsonSchema, SetupNeeded, UtilityActionConfirmation } from "./utility.js";
import { UtilityProvider, UtilitySecretType } from "./utility.js";

export type WebhookProviderId = UtilityProvider;

// export interface WebhookCredentials {
//   [key: string]: any;
// }

export enum WebhookStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  INACTIVE = 'inactive',
}

// export interface SetupWebhookRequest {
//   webhookProviderId: WebhookProviderId;
//   agentId: string;
//   webhookCredentials: WebhookCredentials;
// }


// /**
//  * User webhook record in database
//  */
// export interface UserWebhookRecord {
//   webhook_id: string;
//   client_user_id: string;
//   status: WebhookStatus;
//   created_at?: Date;
//   updated_at?: Date;
// }

/**
 * User webhook
 */
export interface UserWebhook {
  webhookId: string;
  clientUserId: string;
  status: WebhookStatus;
  createdAt?: Date;
}

export interface CreateUserWebhookRequest {
  webhookId: string;
}


// /**
//    * Standard interface for all utility tools in the system
//    */
// export interface WebhookRecord {
//   id: string;   /** Unique identifier for the utility */
//   description: string;  /** Human-readable description of what the utility does */
//   webhook_provider_id: WebhookProviderId;     /** The provider enum (e.g., UtilityProvider.GMAIL) */
//   subscribed_event_id: string; // Id of the subscribed event in the utility provider
//   required_secrets: UtilitySecretType[];     /** Secrets required from secret-service (includes action confirmations like WEBHOOK_URL_INPUTED) */
//   user_identification_mapping: Record<UtilitySecretType, string>; // Mapping of user identification fields to the user's secrets
//   event_payload_schema: Record<string, unknown>; // Schema defining the input parameters for the utility
// }

export interface WebhookData {
  name: string;
  description: string;
  webhookProviderId: WebhookProviderId;
  subscribedEventId: string;
  requiredSecrets: UtilitySecretType[];
  userIdentificationMapping: Record<UtilitySecretType, string>;
  eventPayloadSchema: Record<string, unknown>;
}

export interface Webhook extends WebhookData {
  id: string;   /** Unique identifier for the utility */
}

export type CreateWebhookRequest = WebhookData;

/**
 * Standardized response when setup (OAuth, secrets, actions) is needed.
 */
export interface WebhookSetupNeeded extends SetupNeeded {
  webhookProviderId: WebhookProviderId;
  webhookUrlToInput?: string; // Webhook URL to input in the provider dashboard
}
// /**
//  * Webhook agent mapping in database
//  */
// export interface WebhookAgentLinkRecord {
//   agent_id: string;
//   webhook_provider_id: WebhookProviderId;
//   client_user_id: string;
//   created_at?: Date;
// }

export interface WebhookAgentLink {
  webhookId: string;
  clientUserId: string;
  agentId: string;
};

export interface CreateWebhookAgentLinkRequest {
  webhookId: string;
  clientUserId: string;
  agentId: string;
};

// /**
//  * Webhook event record in database
//  */
// export interface WebhookEventRecord {
//   webhook_id: string;
//   client_user_id: string;
//   webhook_event_payload: WebhookEventPayload;
//   created_at?: Date;
//   updated_at?: Date;
// }


/**
 * Application-level Webhook Event type (camelCase)
 */
export interface WebhookEvent {
  webhookId: string;
  clientUserId: string;
  webhookEventPayload: WebhookEventPayload;
  createdAt?: Date;
  updatedAt?: Date;
}

// export interface CreateWebhookRequest {
//   webhookProviderId: WebhookProviderId;
//   webhookCredentials: WebhookCredentials;
// }

export interface CreateWebhookEventRequest {
  webhookId: string;
  webhookEventPayload: WebhookEventPayload;
}

// export interface GetAgentFromWebhookAgentLinkRequest {
//   webhookId: string;
// }

/**
 * Webhook message event data base interface
 */
export interface WebhookEventPayload {
  [key: string]: any;
}



// /**
//  * Parameters for getting user IDs associated with a Crisp website.
//  */
// export interface GetCrispUsersParams {
//   websiteId: string; // From path
// }

// /**
//  * Response containing user IDs associated with a Crisp website.
//  */
// export interface CrispUsersResponse {
//   userIds: string[];
// }



// /**
//  * Webhook event data for Crisp
//  */
// export interface WebhookEventPayloadCrisp extends WebhookEventPayload {
//   website_id: string;
//   event: 'message:send';
//   data: {
//     website_id: string;
//     session_id: string;
//     inbox_id: string | null;
//     type: 'text';
//     origin: 'chat';
//     content: string;
//     timestamp: number;
//     fingerprint: number;
//     from: 'user';
//     user: {
//       nickname: string;
//       user_id: string;
//     };
//     stamped: true;
//   };
//   timestamp: number;
// }
