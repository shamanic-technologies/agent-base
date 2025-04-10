/**
 * Types for webhook integrations
 */

import { BaseResponse } from './common.js';

export enum WebhookProvider {
  CRISP = 'crisp'
}

export interface WebhookCredentials {};
export interface CrispWebhookCredentials extends WebhookCredentials {
  website_id: string;
}

/**
 * Webhook record in database
 */
export interface Webhook {
  webhook_provider_id: string;
  user_id: string;
  webhook_credentials: WebhookCredentials;
  created_at?: Date;
  updated_at?: Date;
}

export interface CrispWebhook extends Webhook {
  webhook_credentials: CrispWebhookCredentials;
}

/**
 * Webhook agent mapping in database
 */
export interface WebhookAgentMapping {
  agent_id: string;
  webhook_provider_id: WebhookProvider | string;
  user_id: string;
  created_at?: Date;
}

/**
 * Webhook event record in database
 */
export interface WebhookEvent {
  webhook_provider_id: string;
  user_id: string;
  webhook_event_payload: WebhookEventPayload;
  created_at?: Date;
  updated_at?: Date;
}

/**
 * Webhook API response
 */
export interface WebhookResponse extends BaseResponse {
  data?: Record<string, any>;
  message?: string;
  details?: string;
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