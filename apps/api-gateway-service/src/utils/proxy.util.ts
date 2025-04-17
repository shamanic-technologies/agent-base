/**
 * Proxy Utilities
 *
 * Helper function for creating configured proxy middleware.
 */
import express from 'express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';

/**
 * Creates a configured instance of the http-proxy-middleware.
 *
 * @param targetServiceUrl - The base URL of the target service to proxy to.
 * @param serviceName - A name for the service for logging purposes (e.g., 'Agent Service').
 * @returns Configured proxy middleware.
 */
export const createApiProxy = (
  targetServiceUrl: string,
  serviceName: string
) => {
  // Validate the target URL
  if (!targetServiceUrl) {
    console.error(`[ApiProxy/${serviceName}] FATAL: Target Service URL is not configured.`);
    // Throw an error during setup if the URL is missing
    throw new Error(`Target Service URL must be provided for ${serviceName} proxy.`);
  }

  // Define proxy middleware options
  // Note: Event handlers (onProxyReq, onError) and logLevel removed due to persistent type errors.
  const proxyOptions: Options = {
    target: targetServiceUrl,
    changeOrigin: true, // Essential for setting the host header correctly
    // Assume target services expect the path as received by the gateway relative to the mount point
    // e.g., Gateway /agent/abc -> Target /agent/abc
    pathRewrite: {
        // No rewrite needed by default
    },

  };

  console.log(`[ApiProxy] Configured proxy for ${serviceName} targeting ${targetServiceUrl}`);

  // Create and return the proxy middleware instance
  return createProxyMiddleware(proxyOptions);
}; 