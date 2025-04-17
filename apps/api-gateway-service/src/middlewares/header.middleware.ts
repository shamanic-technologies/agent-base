/**
 * Header Injection Middleware
 * 
 * This middleware extracts user/authentication information added to the 
 * Express Request object (e.g., by authentication middleware) and injects 
 * them as standard HTTP headers.
 * This is useful for ensuring downstream services receive necessary context via headers
 * when requests are proxied through the API Gateway.
 */
import express from 'express';

/**
 * Middleware function to inject custom headers based on request properties.
 * 
 * It looks for `platformUserId`, `platformApiKey`, and `clientUserId` on the `req` object
 * and sets the corresponding `x-platform-user-id`, `x-platform-api-key`, and 
 * `x-client-user-id` headers.
 * 
 * @param {express.Request} req - The Express request object.
 * @param {express.Response} res - The Express response object.
 * @param {express.NextFunction} next - The next middleware function.
 */
export const injectCustomHeaders: express.RequestHandler = (req, res, next) => {
  const platformUserId = req.platformUserId;
  const platformApiKey = req.platformApiKey;
  const clientUserId = req.clientUserId;

  // Basic check to ensure properties exist (added by preceding auth middleware)
  if (!platformUserId || !platformApiKey || !clientUserId) {
      console.warn('[HeaderInjectMiddleware] Missing required user/API key information in request object. Cannot forward all required headers.');
      // Decide if this should be a hard failure or just a warning
      // For now, we proceed but log a warning. Downstream service might handle missing headers.
      // To make it a hard failure, uncomment below:
      // return res.status(401).json({ success: false, error: 'Unauthorized: Missing critical user/key info for header injection.' });
  }

  // Add headers to the request object. These will be picked up by subsequent middleware (like the proxy).
  if (platformUserId) req.headers['x-platform-user-id'] = platformUserId;
  if (platformApiKey) req.headers['x-platform-api-key'] = platformApiKey;
  if (clientUserId) req.headers['x-client-user-id'] = clientUserId;

  console.log('[HeaderInjectMiddleware] Injected custom headers from request properties.');
  next(); // Pass control to the next middleware in the chain
}; 