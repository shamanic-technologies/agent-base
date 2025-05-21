/**
 * Authentication Middleware for Web Gateway Service
 * 
 * Validates platformUser JWT tokens by calling the Authentication Service,
 * populates req.platformUser, and adds x-platform-user-* headers for downstream services.
 */
import { Request, Response, NextFunction } from 'express';

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

  // Extract the platform user ID from the x-platform-user-id header.
  // This header is expected to be set by the trusted Next.js backend.
  const platformUserId = req.headers['x-platform-user-id'] as string | undefined;

  // If no platformUserId is present for a path that requires it.
  if (!platformUserId) {
    console.warn(`[Auth Middleware] Missing 'x-platform-user-id' header for protected path: ${req.path} from IP: ${req.ip}. This header should be set by the calling service (e.g., Next.js backend).`);
    res.status(400).json({ success: false, error: "Missing required 'x-platform-user-id' header." });
    return; // Stop processing
  }
  
  try {
    // Attach a simplified platformUser object to the request.
    // Downstream services will use the x-platform-user-id header directly,
    // but having req.platformUser can be useful for logic within the gateway itself if ever needed.
    // @ts-ignore - Dynamically adding property to Request
    req.platformUserId = platformUserId; 
    
    // Ensure the x-platform-user-id header is available for downstream services.
    // It should already be there if we're reading it, but this is a good place to ensure it's set if it were transformed.
    // req.headers['x-platform-user-id'] = platformUserId; // Already present, no need to reset unless transformed.

    // Proceed to the next middleware or route handler
    next();
  } catch (error) {
    // Catch any unexpected errors during this simplified process
    console.error(`[Auth Middleware] Internal server error during user context setup for path ${req.path}:`, error);
    res.status(500).json({ success: false, error: 'Internal server error during user context processing.' });
    return; // Stop processing
  }
} 