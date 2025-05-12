/**
 * Types for webhook integrations
 */
import { UtilityProvider } from "./utility.js";

export type WebhookProviderId = UtilityProvider;

export enum WebhookStatus {
  UNSET = 'unset',
  ACTIVE = 'active',
  DISABLED = 'disabled', // To be implemented later
}

/**
 * User webhook
 */
export interface UserWebhook {
  webhookId: string;
  clientUserId: string;
  platformUserId: string;
  status: WebhookStatus;
  webhookSecret: string; // Unique secret for this webhook link
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateUserWebhookRequest {
  webhookId: string;
}

export interface WebhookData {
  name: string;
  description: string;
  webhookProviderId: WebhookProviderId;
  subscribedEventId: string;
  conversationIdIdentificationMapping: string;
  creatorClientUserId: string;
}

export interface Webhook extends WebhookData {
  id: string;   /** Unique identifier for the utility */
  createdAt?: Date;
  updatedAt?: Date;
}

export type CreateWebhookRequest = WebhookData;

export interface AgentUserWebhook {
  webhookId: string;
  clientUserId: string;
  platformUserId: string;
  agentId: string;
};

export interface CreateAgentUserWebhookRequest {
  webhookId: string;
  agentId: string;
};

/**
 * Application-level Webhook Event type (camelCase)
 */
export interface WebhookEvent {
  eventId: string; // Unique identifier for the event record
  webhookId: string;
  clientUserId: string;
  platformUserId: string;
  payload: WebhookEventPayload;
  providerId: WebhookProviderId;
  subscribedEventId: string;
  webhookSecret: string;
  conversationId: string;
  agentId: string;
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

export interface SearchWebhookResultItem {
  id: string;
  name: string;
  description: string;
  webhookProviderId: WebhookProviderId;
  subscribedEventId: string;
  isLinkedToCurrentUser?: boolean;
  currentUserWebhookStatus?: WebhookStatus;
  isLinkedToAgent?: boolean;
  linkedAgentId?: string;
}

export interface SearchWebhookResult {
  items: SearchWebhookResultItem[];
  total: number;
}
