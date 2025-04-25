/**
 * Types for webhook integrations
 */
import { UtilityProvider, UtilitySecretType } from "./utility.js";

export type WebhookProviderId = UtilityProvider;

export enum WebhookStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  INACTIVE = 'inactive',
}

/**
 * User webhook
 */
export interface UserWebhook {
  webhookId: string;
  clientUserId: string;
  platformUserId: string;
  status: WebhookStatus;
  clientUserIdentificationHash: string; // Hash of identifiers linking webhook event to client user
  createdAt?: Date;
}

export interface CreateUserWebhookRequest {
  webhookId: string;
}


export interface WebhookData {
  name: string;
  description: string;
  webhookProviderId: WebhookProviderId;
  subscribedEventId: string;
  requiredSecrets: UtilitySecretType[];
  clientUserIdentificationMapping: Record<UtilitySecretType, string>;
  conversationIdIdentificationMapping: string;
  eventPayloadSchema: Record<string, unknown>;
}

export interface Webhook extends WebhookData {
  id: string;   /** Unique identifier for the utility */
}

export type CreateWebhookRequest = WebhookData;




export interface WebhookAgentLink {
  webhookId: string;
  clientUserId: string;
  platformUserId: string;
  agentId: string;
};

export interface CreateWebhookAgentLinkRequest {
  webhookId: string;
  agentId: string;
};

/**
 * Application-level Webhook Event type (camelCase)
 */
export interface WebhookEvent {
  webhookId: string;
  clientUserId: string;
  platformUserId: string;
  webhookEventPayload: WebhookEventPayload;
  createdAt?: Date;
  updatedAt?: Date;
}


export interface CreateWebhookEventRequest {
  webhookId: string;
  webhookEventPayload: WebhookEventPayload;
}


/**
 * Webhook message event data base interface
 */
export interface WebhookEventPayload {
  [key: string]: any;
}

