/**
 * Types for webhook integrations
 */

export enum WebhookProvider {
  CRISP = 'crisp'
}

export interface WebhookCredentials {};
// export interface CrispWebhookCredentials extends WebhookCredentials {
//   website_id: string;
// }

/**
 * Webhook record in database
 */
export interface WebhookRecord {
  webhook_provider_id: string;
  client_user_id: string;
  webhook_credentials: WebhookCredentials;
  created_at?: Date;
  updated_at?: Date;
}

export interface Webhook {
  webhookProviderId: string;
  clientUserId: string;
  webhookCredentials: WebhookCredentials;
  createdAt?: Date;
  updatedAt?: Date;
}

// export interface CrispWebhook extends Webhook {
//   webhook_credentials: CrispWebhookCredentials;
// }

/**
 * Webhook agent mapping in database
 */
export interface WebhookAgentRecord {
  agent_id: string;
  webhook_provider_id: WebhookProvider;
  client_user_id: string;
  created_at?: Date;
}

/**
 * Webhook event record in database
 */
export interface WebhookEventRecord {
  webhook_provider_id: string;
  client_user_id: string;
  webhook_event_payload: WebhookEventPayload;
  created_at?: Date;
  updated_at?: Date;
}


/**
 * Application-level Webhook Event type (camelCase)
 */
export interface WebhookEvent {
  webhookProviderId: string;
  clientUserId: string;
  webhookEventPayload: WebhookEventPayload;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateWebhookRequest {
  webhookProviderId: string;
  clientUserId: string;
  webhookCredentials: WebhookCredentials;
}

export interface MapAgentToWebhookRequest {
  agentId: string;
  webhookProviderId: string;
  clientUserId: string;
}

export interface CreateWebhookEventRequest {
  webhookProviderId: string;
  clientUserId: string;
  webhookEventPayload: WebhookEventPayload;
}

export interface GetWebhookAgentRequest {
  webhookProviderId: string;
  clientUserId: string;
}

/**
 * Parameters for getting user IDs associated with a Crisp website.
 */
export interface GetCrispUsersParams {
  websiteId: string; // From path
}

/**
 * Response containing user IDs associated with a Crisp website.
 */
export interface CrispUsersResponse {
  userIds: string[];
}

/**
 * Webhook message event data base interface
 */
export interface WebhookEventPayload {
  [key: string]: any;
}

/**
 * Webhook event data for Crisp
 */
export interface WebhookEventPayloadCrisp extends WebhookEventPayload {
  website_id: string;
  event: 'message:send';
  data: {
    website_id: string;
    session_id: string;
    inbox_id: string | null;
    type: 'text';
    origin: 'chat';
    content: string;
    timestamp: number;
    fingerprint: number;
    from: 'user';
    user: {
      nickname: string;
      user_id: string;
    };
    stamped: true;
  };
  timestamp: number;
}
