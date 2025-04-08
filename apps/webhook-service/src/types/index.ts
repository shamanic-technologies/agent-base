/**
 * Webhook Service Types
 */

// Available webhook providers
export enum WebhookProvider {
  CRISP = 'crisp',
  // Add more providers here as needed
}

// Webhook configuration
export interface WebhookConfig {
  webhook_id: string;             // ID of the webhook provider (e.g., 'crisp')
  provider: WebhookProvider;      // Type of the webhook provider
  webhook_data: Record<string, any>;  // Provider-specific configuration data
}

// Event received from a webhook provider
export interface WebhookEvent {
  provider: WebhookProvider;         // Source of the event
  event_type: string;                // Type of event (e.g., 'message:send')
  timestamp: number;                 // When the event occurred
  raw_data: Record<string, any>;     // Raw event data from the provider
  processed_data?: Record<string, any>; // Processed data for agent consumption
}

// Crisp-specific types
export interface CrispWebhookEvent {
  timestamp: number;
  event: string;
  data: {
    website_id: string;
    session_id: string;
    website?: any;
    user?: any;
    message?: CrispMessage;
    // Add other Crisp event data structures as needed
  };
}

export interface CrispMessage {
  content: string;
  from: string;
  type: string;
  origin: string;
  fingerprint: string;
  timestamp: number;
  user?: {
    nickname: string;
    user_id: string;
  };
}

// Request structure sent to agent run endpoint
export interface AgentRunRequest {
  event_type: string;
  provider: WebhookProvider;
  data: Record<string, any>;
  agent_id: string;
  conversation_id: string;
}

// Response from agent run endpoint
export interface AgentRunResponse {
  success: boolean;
  response?: {
    content: string;
    type: string;
  };
  error?: string;
}

// Database schema types
export interface DbWebhook {
  webhook_id: string;              // ID of the webhook provider (e.g., 'crisp')
  webhook_data: Record<string, any>; // Provider-specific webhook data
} 