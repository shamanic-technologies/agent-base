/**
 * Types for webhook integrations
 */

export enum WebhookProviderId {
  CRISP = 'crisp'
}

export interface WebhookCredentials {
  [key: string]: any;
}

export interface SetupWebhookRequest {
  webhookProviderId: WebhookProviderId;
  agentId: string;
  webhookCredentials: WebhookCredentials;
}

/**
 * Webhook record in database
 */
export interface WebhookRecord {
  webhook_provider_id: WebhookProviderId;
  client_user_id: string;
  webhook_credentials: WebhookCredentials;
  created_at?: Date;
  updated_at?: Date;
}

export interface Webhook {
  webhookProviderId: WebhookProviderId;
  clientUserId: string;
  webhookCredentials: WebhookCredentials;
  createdAt?: Date;
  updatedAt?: Date;
}


/**
 * Webhook agent mapping in database
 */
export interface WebhookAgentLinkRecord {
  agent_id: string;
  webhook_provider_id: WebhookProviderId;
  client_user_id: string;
  created_at?: Date;
}

export interface WebhookAgentLink {
  agentId: string;
  webhookProviderId: WebhookProviderId;
  clientUserId: string;
};

export interface CreateWebhookAgentLinkRequest {
  agentId: string;
  webhookProviderId: WebhookProviderId;
};

/**
 * Webhook event record in database
 */
export interface WebhookEventRecord {
  webhook_provider_id: WebhookProviderId;
  client_user_id: string;
  webhook_event_payload: WebhookEventPayload;
  created_at?: Date;
  updated_at?: Date;
}


/**
 * Application-level Webhook Event type (camelCase)
 */
export interface WebhookEvent {
  webhookProviderId: WebhookProviderId;
  clientUserId: string;
  webhookEventPayload: WebhookEventPayload;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateWebhookRequest {
  webhookProviderId: WebhookProviderId;
  webhookCredentials: WebhookCredentials;
}



export interface CreateWebhookEventRequest {
  webhookProviderId: WebhookProviderId;
  webhookEventPayload: WebhookEventPayload;
}

export interface GetWebhookAgentLinkRequest {
  webhookProviderId: WebhookProviderId;
}

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
