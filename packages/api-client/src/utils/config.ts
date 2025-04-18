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
 * Retrieves the Web OAuth Service URL from environment variables or defaults.
 * Includes a warning if the environment variable is not set.
 * @returns The Web OAuth Service URL string.
 */
export function getWebOauthServiceUrl(): string {
  const url = process.env.WEB_OAUTH_SERVICE_URL || 'http://localhost:3005';
  if (!process.env.WEB_OAUTH_SERVICE_URL) {
    console.warn('[api-client/config] WEB_OAUTH_SERVICE_URL environment variable not set. Defaulting to ' + url);
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