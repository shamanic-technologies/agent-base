/**
 * Authentication Middleware for Web Gateway Service
 * 
 * Validates platformUser JWT tokens by calling the Authentication Service,
 * populates req.platformUser, and adds x-platform-user-* headers for downstream services.
 */
import { Request, Response, NextFunction } from 'express';
import { PlatformUserId } from '@agent-base/types';
import { ServiceResponse } from '@agent-base/types';
import { validatePlatformUser } from '@agent-base/api-client';

// Define endpoints that should skip this specific user ID check
// Health check is a common one.
// OAuth specific paths might be handled by API key whitelisting in index.ts or might not hit this middleware if Clerk handles them.
// If /auth/logout was previously hitting web-oauth-service, it needs a new home or to be removed if Clerk handles logout.
const SKIP_USER_ID_CHECK_PATHS = [
  '/health', // Health check endpoint
  // '/auth/logout', // Example: if logout doesn't need user context from this middleware
  // '/oauth/google', // These were for the old flow, likely not needed here if API key middleware handles them or they don't pass through
  // '/oauth/google/callback' 
];

/**
 * Express middleware for setting user context from x-platform-user-id header.
 * This middleware assumes that a prior middleware (e.g., API key check) has already
 * authenticated the client (the Next.js backend in this case).
 * - Skips processing for predefined public paths.
 * - Extracts the user ID from the 'x-platform-user-id' header.
 * - If the header is present, attaches a simplified user object to `req.platformUser`.
 * - If the header is missing for a protected route, sends a 400 Bad Request.
 * 
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next middleware function.
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Skip user ID check for configured public paths
  if (SKIP_USER_ID_CHECK_PATHS.some(path => req.path.startsWith(path))) {
    return next();
  }

  const platformAuthUserId = req.headers['x-platform-auth-user-id'] as string | undefined;
  const platformAuthOrganizationId = req.headers['x-platform-auth-organization-id'] as string | undefined;
  let platformUserId = req.headers['x-platform-user-id'] as string | undefined;
  let platformOrganizationId = req.headers['x-platform-organization-id'] as string | undefined;

  // If no platformUserId is present (either from header or after providerId validation) for a path that requires it.
  if (!platformAuthUserId) {
    console.error(`[Auth Middleware] Couldn't retrieve 'x-platform-user-id' header for protected path: ${req.path} from IP: ${req.ip}.`);
    res.status(400).json({ success: false, error: "Couldn't retrieve user identification header 'x-platform-user-id'." });
    return; // Stop processing
  }
  if (!platformAuthOrganizationId) {
    console.error(`[Auth Middleware] Couldn't retrieve 'x-platform-auth-organization-id' header for protected path: ${req.path} from IP: ${req.ip}.`);
    res.status(400).json({ success: false, error: "Couldn't retrieve user identification header 'x-platform-auth-organization-id'." });
    return; // Stop processing
  }

  try {
    const validationResponse: ServiceResponse<PlatformUserId> = await validatePlatformUser(platformAuthUserId);

    if (validationResponse.success) {
      platformUserId = validationResponse.data.platformUserId;
      platformOrganizationId = 'A45FFF8F-4A84-4818-AC38-28617D509581'; // Temporary value until we have a proper orgId validation
      // Set the validated platformUserId for downstream services
      req.headers['x-platform-user-id'] = platformUserId; 
      req.headers['x-platform-organization-id'] = platformOrganizationId;
    } else {
      console.error(`[Auth Middleware] Failed to validate platformUserId '${platformAuthUserId}': ${validationResponse.error}`);
      // Send a 401 Unauthorized or 403 Forbidden, as the platform ID is invalid/not found
      res.status(401).json({ success: false, error: validationResponse.error || "Invalid or unknown platform user ID." });
      return; // Stop processing
    }
  } catch (error: any) {
    console.error(`[Auth Middleware] Error during providerUserId validation for '${platformAuthUserId}':`, error);
    res.status(500).json({ success: false, error: 'Internal server error during provider user ID validation.' });
    return; // Stop processing
  }

  
  try {

    req.platformUserId = platformUserId; 
    req.platformOrganizationId = platformOrganizationId;
    
    // Ensure the x-platform-user-id header is available for downstream services.
    // It should already be there if we're reading it, or it was set after provider ID validation.
    // req.headers['x-platform-user-id'] = platformUserId; // Already set if transformed.

    // Proceed to the next middleware or route handler
    next();
  } catch (error) {
    // Catch any unexpected errors during this simplified process
    console.error(`[Auth Middleware] Internal server error during user context setup for path ${req.path}:`, error);
    res.status(500).json({ success: false, error: 'Internal server error during user context processing.' });
    return; // Stop processing
  }
} 