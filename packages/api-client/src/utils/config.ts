/**
 * Configuration utility for service URLs.
 *
 * Provides functions to retrieve service URLs from environment variables.
 * Throws an error if a required URL is not set or is invalid,
 * preventing the application from starting with a misconfiguration.
 */

/**
 * Validates if the provided URL is a syntactically correct HTTP/HTTPS URL.
 * Throws an error if the URL is invalid.
 *
 * @param {string} url - The URL string to validate.
 * @param {string} variableName - The name of the environment variable from which the URL was sourced (for error messages).
 * @throws {Error} If the URL is invalid.
 */
function validateServiceUrl(url: string, variableName: string): void {
  if (!url) { // Should be caught by the primary check, but good for defense
    throw new Error(`[api-client/config] ${variableName} resolved to an empty value.`);
  }
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new Error(`[api-client/config] ${variableName} (${url}) must use http: or https: protocol.`);
    }
  } catch (e) {
    throw new Error(`[api-client/config] ${variableName} (${url}) is not a valid URL. ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Retrieves the Key Service URL from the KEY_SERVICE_URL environment variable.
 * @returns {string} The Key Service URL.
 * @throws {Error} If KEY_SERVICE_URL is not set or is not a valid URL.
 */
export function getKeyServiceUrl(): string {
  const url = process.env.KEY_SERVICE_URL;
  if (!url) {
    throw new Error('[api-client/config] KEY_SERVICE_URL environment variable is not set. This is required.');
  }
  validateServiceUrl(url, 'KEY_SERVICE_URL');
  return url;
}

/**
 * Retrieves the Database Service URL from the DATABASE_SERVICE_URL environment variable.
 * @returns {string} The Database Service URL.
 * @throws {Error} If DATABASE_SERVICE_URL is not set or is not a valid URL.
 */
export function getDatabaseServiceUrl(): string {
  const url = process.env.DATABASE_SERVICE_URL;
  if (!url) {
    throw new Error('[api-client/config] DATABASE_SERVICE_URL environment variable is not set. This is required.');
  }
  validateServiceUrl(url, 'DATABASE_SERVICE_URL');
  return url;
}

/**
 * Retrieves the Secret Service URL from the SECRET_SERVICE_URL environment variable.
 * @returns {string} The Secret Service URL.
 * @throws {Error} If SECRET_SERVICE_URL is not set or is not a valid URL.
 */
export function getSecretServiceUrl(): string {
  const url = process.env.SECRET_SERVICE_URL;
  if (!url) {
    throw new Error('[api-client/config] SECRET_SERVICE_URL environment variable is not set. This is required.');
  }
  validateServiceUrl(url, 'SECRET_SERVICE_URL');
  return url;
}

/**
 * Retrieves the Utility Tool Service URL from the UTILITY_TOOL_SERVICE_URL environment variable.
 * @returns {string} The Utility Tool Service URL.
 * @throws {Error} If UTILITY_TOOL_SERVICE_URL is not set or is not a valid URL.
 */
export function getUtilityToolServiceUrl(): string {
  const url = process.env.UTILITY_TOOL_SERVICE_URL;
  if (!url) {
    throw new Error('[api-client/config] UTILITY_TOOL_SERVICE_URL environment variable is not set. This is required.');
  }
  validateServiceUrl(url, 'UTILITY_TOOL_SERVICE_URL');
  return url;
}

/**
 * Retrieves the API Gateway Service URL from the API_GATEWAY_SERVICE_URL environment variable.
 * @returns {string} The API Gateway Service URL.
 * @throws {Error} If API_GATEWAY_SERVICE_URL is not set or is not a valid URL.
 */
export function getApiGatewayServiceUrl(): string {
  const url = process.env.API_GATEWAY_SERVICE_URL;
  if (!url) {
    throw new Error('[api-client/config] API_GATEWAY_SERVICE_URL environment variable is not set. This is required.');
  }
  validateServiceUrl(url, 'API_GATEWAY_SERVICE_URL');
  return url;
}

/**
 * Retrieves the Agent Service URL from the AGENT_SERVICE_URL environment variable.
 * @returns {string} The Agent Service URL.
 * @throws {Error} If AGENT_SERVICE_URL is not set or is not a valid URL.
 */
export function getAgentServiceUrl(): string {
  const url = process.env.AGENT_SERVICE_URL;
  if (!url) {
    throw new Error('[api-client/config] AGENT_SERVICE_URL environment variable is not set. This is required.');
  }
  validateServiceUrl(url, 'AGENT_SERVICE_URL');
  return url;
}

/**
 * Retrieves the Webhook Tool API URL from the WEBHOOK_TOOL_API_URL environment variable.
 * @returns {string} The Webhook Tool API URL.
 * @throws {Error} If WEBHOOK_TOOL_API_URL is not set or is not a valid URL.
 */
export function getWebhookToolApiUrl(): string {
  const url = process.env.WEBHOOK_TOOL_API_URL;
  if (!url) {
    throw new Error('[api-client/config] WEBHOOK_TOOL_API_URL environment variable is not set. This is required.');
  }
  validateServiceUrl(url, 'WEBHOOK_TOOL_API_URL');
  return url;
}

/**
 * Retrieves the API Tool API URL from the API_TOOL_API_URL environment variable.
 * @returns {string} The API Tool API URL.
 * @throws {Error} If API_TOOL_API_URL is not set or is not a valid URL.
 */
export function getApiToolApiUrl(): string {
  const url = process.env.API_TOOL_API_URL;
  if (!url) {
    throw new Error('[api-client/config] API_TOOL_API_URL environment variable is not set. This is required.');
  }
  validateServiceUrl(url, 'API_TOOL_API_URL');
  return url;
}

/**
 * Retrieves the Agent Base API URL from the AGENT_BASE_API_URL environment variable.
 * This is often the same as the API Gateway URL.
 * @returns {string} The Agent Base API URL.
 * @throws {Error} If AGENT_BASE_API_URL is not set or is not a valid URL.
 */
export function getAgentBaseApiUrl(): string {
  const url = process.env.AGENT_BASE_API_URL;
  if (!url) {
    throw new Error('[api-client/config] AGENT_BASE_API_URL environment variable is not set. This is required.');
  }
  validateServiceUrl(url, 'AGENT_BASE_API_URL');
  return url;
}

/**
 * Retrieves the Payment Service URL from the PAYMENT_SERVICE_URL environment variable.
 * @returns {string} The Payment Service URL.
 * @throws {Error} If PAYMENT_SERVICE_URL is not set or is not a valid URL.
 */
export function getPaymentServiceUrl(): string {
  const url = process.env.PAYMENT_SERVICE_URL;
  if (!url) {
    throw new Error('[api-client/config] PAYMENT_SERVICE_URL environment variable is not set. This is required.');
  }
  validateServiceUrl(url, 'PAYMENT_SERVICE_URL');
  return url;
}

/**
 * Retrieves the Logging Service URL from the LOGGING_SERVICE_URL environment variable.
 * @returns {string} The Logging Service URL.
 * @throws {Error} If LOGGING_SERVICE_URL is not set or is not a valid URL.
 */
export function getLoggingServiceUrl(): string {
  const url = process.env.LOGGING_SERVICE_URL;
  if (!url) {
    throw new Error('[api-client/config] LOGGING_SERVICE_URL environment variable is not set. This is required.');
  }
  validateServiceUrl(url, 'LOGGING_SERVICE_URL');
  return url;
}

/**
 * Retrieves the User Service URL from the USER_SERVICE_URL environment variable.
 * @returns {string} The User Service URL.
 * @throws {Error} If USER_SERVICE_URL is not set or is not a valid URL.
 */
export function getUserServiceUrl(): string {
  const url = process.env.USER_SERVICE_URL;
  if (!url) {
    throw new Error('[api-client/config] USER_SERVICE_URL environment variable is not set. This is required.');
  }
  validateServiceUrl(url, 'USER_SERVICE_URL');
  return url;
} 

/**
 * Retrieves the Dashboard Service URL from the DASHBOARD_SERVICE_URL environment variable.
 * @returns {string} The Dashboard Service URL.
 * @throws {Error} If DASHBOARD_SERVICE_URL is not set or is not a valid URL.
 */
export function getDashboardServiceUrl(): string {
  const url = process.env.DASHBOARD_SERVICE_URL;
  if (!url) {
    throw new Error('[api-client/config] DASHBOARD_SERVICE_URL environment variable is not set. This is required.');
  }
  validateServiceUrl(url, 'DASHBOARD_SERVICE_URL');
  return url;
}

/**
 * Retrieves the LangGraph Service URL from the LANGGRAPH_SERVICE_URL environment variable.
 * @returns {string} The LangGraph Service URL.
 * @throws {Error} If LANGGRAPH_SERVICE_URL is not set or is not a valid URL.
 */
export function getLangGraphServiceUrl(): string {
  const url = process.env.LANGGRAPH_SERVICE_URL;
  if (!url) {
    throw new Error('[api-client/config] LANGGRAPH_SERVICE_URL environment variable is not set. This is required.');
  }
  validateServiceUrl(url, 'LANGGRAPH_SERVICE_URL');
  return url;
}
