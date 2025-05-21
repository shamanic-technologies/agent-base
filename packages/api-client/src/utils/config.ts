/**
 * Configuration utilities for API Client
 * Centralizes environment variable access for service URLs.
 */

/**
 * Retrieves the Key Service URL from environment variables or defaults.
 * Includes a warning if the environment variable is not set.
 * @returns The Key Service URL string.
 */
export function getKeyServiceUrl(): string {
  const url = process.env.KEY_SERVICE_URL || 'http://localhost:3003';
  if (!process.env.KEY_SERVICE_URL) {
    console.warn('[api-client/config] KEY_SERVICE_URL environment variable not set. Defaulting to ' + url);
  }
  return url;
}

/**
 * Retrieves the Secret Service URL from environment variables or defaults.
 * Includes a warning if the environment variable is not set.
 * @returns The Secret Service URL string.
 */
export function getSecretServiceUrl(): string {
  const url = process.env.SECRET_SERVICE_URL || 'http://localhost:3070';
  if (!process.env.SECRET_SERVICE_URL) {
    console.warn('[api-client/config] SECRET_SERVICE_URL environment variable not set. Defaulting to ' + url);
  }
  return url;
}

/**
 * Retrieves the Database Service URL from environment variables or defaults.
 * Includes a warning if the environment variable is not set.
 * @returns The Database Service URL string.
 */
export function getDatabaseServiceUrl(): string {
  const url = process.env.DATABASE_SERVICE_URL || 'http://localhost:3006';
  if (!process.env.DATABASE_SERVICE_URL) {
    console.warn('[api-client/config] DATABASE_SERVICE_URL environment variable not set. Defaulting to ' + url);
  }
  return url;
}

/**
 * Retrieves the External Utility Tool Service URL from environment variables or defaults.
 * Includes a warning if the environment variable is not set.
 * @returns The External Utility Tool Service URL string.
 */
export function getExternalUtilityToolServiceUrl(): string {
  // Assuming default port 3008, adjust if necessary
  const url = process.env.EXTERNAL_UTILITY_TOOL_SERVICE_URL || 'http://localhost:3090'; 
  if (!process.env.EXTERNAL_UTILITY_TOOL_SERVICE_URL) {
    console.warn('[api-client/config] EXTERNAL_UTILITY_TOOL_SERVICE_URL environment variable not set. Defaulting to ' + url);
  }
  return url;
}

/**
 * Retrieves the External Utility Tool Service URL from environment variables or defaults.
 * Includes a warning if the environment variable is not set.
 * @returns The External Utility Tool Service URL string.
 */
export function getUtilityToolServiceUrl(): string {
    // Assuming default port 3008, adjust if necessary
    const url = process.env.UTILITY_TOOL_SERVICE_URL || 'http://localhost:3050'; 
    if (!process.env.UTILITY_TOOL_SERVICE_URL) {
      console.warn('[api-client/config] UTILITY_TOOL_SERVICE_URL environment variable not set. Defaulting to ' + url);
    }
    return url;
  } 

/**
 * Retrieves the External Utility Tool Service URL from environment variables or defaults.
 * Includes a warning if the environment variable is not set.
 * @returns The External Utility Tool Service URL string.
 */
export function getApiGatewayServiceUrl(): string {
    // Assuming default port 3008, adjust if necessary
    const url = process.env.API_GATEWAY_SERVICE_URL || 'http://localhost:3002'; 
    if (!process.env.API_GATEWAY_SERVICE_URL) {
      console.warn('[api-client/config] API_GATEWAY_SERVICE_URL environment variable not set. Defaulting to ' + url);
    }
    return url;
  } 

/**
 * Retrieves the Agent Service URL from environment variables or defaults.
 * Includes a warning if the environment variable is not set.
 * @returns The Agent Service URL string.
 */
export function getAgentServiceUrl(): string {
  // Assuming default port 3001 for agent-service
  const url = process.env.AGENT_SERVICE_URL || 'http://localhost:3001'; 
  if (!process.env.AGENT_SERVICE_URL) {
    console.warn('[api-client/config] AGENT_SERVICE_URL environment variable not set. Defaulting to ' + url);
  }
  return url;
} 

/**
 * Retrieves the Webhook Tool API URL from environment variables or defaults.
 * Includes a warning if the environment variable is not set.
 * @returns The Webhook Tool API URL string.
 */
export function getWebhookToolApiUrl(): string {
  // Default port 4000 based on openapi.json
  const url = process.env.WEBHOOK_TOOL_API_URL || 'http://localhost:4000/api/v1/webhooks';
  if (!process.env.WEBHOOK_TOOL_API_URL) {
    // Using logger instead of console.warn for consistency if logger exists
    console.warn('[api-client/config] WEBHOOK_TOOL_API_URL environment variable not set. Defaulting to ' + url);
  }
  return url;
} 

/**
 * Retrieves the Webhook Tool API URL from environment variables or defaults.
 * Includes a warning if the environment variable is not set.
 * @returns The Webhook Tool API URL string.
 */
export function getApiToolApiUrl(): string {
  const url = process.env.API_TOOL_API_URL || 'http://localhost:4010/api/v1';
  if (!process.env.API_TOOL_API_URL) {
    // Using logger instead of console.warn for consistency if logger exists
    console.warn('[api-client/config] API_TOOL_API_URL environment variable not set. Defaulting to ' + url);
  }
  return url;
} 

/**
 * Retrieves the Webhook Store Service URL from environment variables or defaults.
 * Includes a warning if the environment variable is not set.
 * @returns The Webhook Store Service URL string.
 */
export function getAgentBaseApiUrl(): string {
  // Default port 4000 based on openapi.json
  const url = process.env.AGENT_BASE_API_URL || 'http://localhost:3002';
  if (!process.env.AGENT_BASE_API_URL) {
    // Using logger instead of console.warn for consistency if logger exists
    console.warn('[api-client/config] AGENT_BASE_API_URL environment variable not set. Defaulting to ' + url);
  }
  return url;
} 

/**
 * Retrieves the Payment Service URL from environment variables or defaults.
 * Includes a warning if the environment variable is not set.
 * @returns The Payment Service URL string.
 */
export function getPaymentServiceUrl(): string {
  const url = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3004';
  if (!process.env.PAYMENT_SERVICE_URL) {
    console.warn('[api-client/config] PAYMENT_SERVICE_URL environment variable not set. Defaulting to ' + url);
  }
  return url;
} 