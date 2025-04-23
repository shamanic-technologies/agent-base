/**
 * Proxy Utilities
 *
 * Provides a helper function to create configured proxy middleware instances
 * for forwarding requests from the API Gateway to downstream services.
 * This centralizes proxy configuration and leverages the 'http-proxy-middleware' library.
 */
import { createProxyMiddleware, Options } from 'http-proxy-middleware';

/**
 * Creates a configured instance of http-proxy-middleware for a specific downstream service.
 *
 * This function sets up the target URL, necessary headers, and basic logging
 * for proxied requests. It throws an error during setup if the target URL is invalid.
 *
 * @param {string} targetServiceUrl - The base URL of the target downstream service (e.g., 'http://agent-service:8080').
 * @param {string} serviceName - A descriptive name for the target service used in logs (e.g., 'Agent Service').
 * @returns {Function} Configured Express middleware instance for proxying requests.
 * @throws {Error} If targetServiceUrl is not provided or is invalid.
 */
export const createApiProxy = (
  targetServiceUrl: string,
  serviceName: string
) => {
  // --- Validation ---
  // Ensure a valid target URL is provided during application setup.
  if (!targetServiceUrl) {
    const errorMessage = `[ApiProxy/${serviceName}] FATAL: Target Service URL is not configured.`;
    console.error(errorMessage);
    // Throwing an error prevents the gateway from starting with invalid config.
    throw new Error(`Target Service URL must be provided for ${serviceName} proxy.`);
  }
  try {
    // Validate if the URL is syntactically correct.
    new URL(targetServiceUrl);
  } catch (error) {
    const errorMessage = `[ApiProxy/${serviceName}] FATAL: Invalid Target Service URL provided: ${targetServiceUrl}`;
    console.error(errorMessage, error);
    throw new Error(`Invalid Target Service URL for ${serviceName} proxy: ${targetServiceUrl}`);
  }

  // --- Proxy Configuration ---
  const proxyOptions: Options = {
    // The target service's base URL.
    target: targetServiceUrl,
    // Change the 'Host' header to the target's hostname. Essential for virtual hosts.
    changeOrigin: true,
    // Modify the path before forwarding. We don't rewrite by default.
    pathRewrite: {},
    // Headers and logging will be handled outside this basic configuration.
  };

  // Create and return the proxy middleware instance with the defined options.
  return createProxyMiddleware(proxyOptions);
}; 