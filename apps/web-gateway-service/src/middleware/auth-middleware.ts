/**
 * Authentication Middleware for Web Gateway Service
 * 
 * Validates platformUser JWT tokens by calling the Authentication Service,
 * populates req.platformUser, and adds x-platform-user-* headers for downstream services.
 */
import { Request, Response, NextFunction } from 'express';
// Assuming types are exported from the shared package
import { PlatformUser, ServiceResponse, OAuthProvider } from '@agent-base/types'; 
// Assuming httpClient is exported from the shared package
import { tokenCache } from '../utils/token-cache.js'; 
import jwt from 'jsonwebtoken';
import axios from 'axios';

import { validateAuthToken } from '@agent-base/api-client'; // Import the new client function
// Removed fs and path as manual env loading is removed

// Load environment variables at the start (ideally done in index.ts)
// dotenv.config(); 

// Add diagnostic logging for environment variables
console.log('[Auth Middleware] Initializing...');
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`WEB_OAUTH_SERVICE_URL: ${process.env.WEB_OAUTH_SERVICE_URL}`);

// Get auth service URL and JWT secret from environment variables
// Throw error if essential config is missing in production
const WEB_OAUTH_SERVICE_URL = process.env.WEB_OAUTH_SERVICE_URL;

if (process.env.NODE_ENV === 'production' && !WEB_OAUTH_SERVICE_URL) {
  console.error('[Auth Middleware] CRITICAL ERROR: WEB_OAUTH_SERVICE_URL is not defined in production environment.');
  // Optionally, exit the process or prevent the app from starting
  process.exit(1); 
}
if (!WEB_OAUTH_SERVICE_URL) {
    console.warn('[Auth Middleware] WARNING: WEB_OAUTH_SERVICE_URL is not defined. Using default: http://localhost:3005');
}
const webOauthServiceUrl = WEB_OAUTH_SERVICE_URL || 'http://localhost:3005';

console.log(`[Auth Middleware] Using WEB_OAUTH_SERVICE_URL: ${webOauthServiceUrl}`);

// Define endpoints that should skip authentication
// These paths allow unauthenticated access
const SKIP_AUTH_PATHS = [
  '/health', // Health check endpoint
  '/auth/logout', // Logout doesn't strictly need prior auth state here
  '/oauth/google', // Start of Google OAuth flow
  '/oauth/google/callback' // Callback URL for Google OAuth
];

/**
 * Extracts the Bearer token from the Authorization header.
 * 
 * @param {string | undefined} authHeader - The content of the Authorization header.
 * @returns {string | undefined} The extracted platformUser token, or undefined if not found or invalid format.
 */
function extractPlatformUserToken(authHeader: string | undefined): string | undefined {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[Auth Middleware] No or invalid Authorization header format.');
    return undefined;
  }
  const token = authHeader.split(' ')[1];
  if (!token) {
      console.log('[Auth Middleware] Token missing after Bearer prefix.');
      return undefined;
  }
  return token;
}

// Removed decodeToken function as it's redundant

/**
 * Validates the platformUser token by calling the Authentication Service via the API client.
 * Uses an in-memory cache to avoid repeated validation calls for the same token.
 * 
 * @param {string} platformUserToken - The JWT token to validate.
 * @returns {Promise<ServiceResponse<PlatformUser>>} A promise resolving to the ServiceResponse containing PlatformUser or an error.
 */
async function validatePlatformUserToken(platformUserToken: string): Promise<ServiceResponse<PlatformUser>> {
  // Check cache first
  const cachedUser = tokenCache.get(platformUserToken);
  if (cachedUser) {
    return {
      success: true,
      data: cachedUser as PlatformUser 
    };
  }
  
  
  // Call the API client function, passing the token
  const validateResponse = await validateAuthToken(platformUserToken);

  
  // If validation was successful and we got user data, cache it
  if (validateResponse.success && validateResponse.data) {
    tokenCache.set(platformUserToken, validateResponse.data);
  } else {
    console.log(`[Auth Middleware] PlatformUser token validation failed: ${validateResponse.error || 'Unknown reason.'}`);
  }

  return validateResponse; // Return the ServiceResponse directly
}

/**
 * Express middleware for authenticating requests using platformUser JWT tokens.
 * - Skips authentication for predefined public paths.
 * - Extracts the Bearer token.
 * - Validates the token using `validatePlatformUserToken`.
 * - If valid, attaches user info to `req.platformUser` and adds `x-platform-user-*` headers.
 * - If invalid or missing token (for protected routes), sends a 401 Unauthorized response.
 * - If an internal error occurs, sends a 500 Internal Server Error response.
 * 
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next middleware function.
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Skip authentication for configured public paths
  if (SKIP_AUTH_PATHS.some(path => req.path.startsWith(path))) {
    return next();
  }
  // Extract the platformUser token from the Authorization header
  const token = extractPlatformUserToken(req.headers.authorization);
  // If no token is present for a path that requires authentication
  if (!token) {
    console.log(`[Auth Middleware] No platformUser token provided for protected path: ${req.path}`);
    res.status(401).json({ success: false, error: 'Authentication required: No platformUser token provided.' });
    return; // Stop processing
  }
  
  try {
    // Validate the extracted token using the refactored function
    const platformUserResponse = await validatePlatformUserToken(token);
    
    // Check the ServiceResponse from the client function
    if (platformUserResponse.success && platformUserResponse.data) {
      const platformUser = platformUserResponse.data;

      // Attach user to request object (ensure Request interface is extended if needed)
      // @ts-ignore - Dynamically adding property to Request
      req.platformUser = platformUser; 
      
      // Add user information as headers for downstream services
      req.headers['x-platform-user-id'] = platformUser.id;

      // Proceed to the next middleware or route handler
      next();
    } else {
      // If token validation fails
      console.log(`[Auth Middleware] Invalid platformUser token for path: ${req.path}. Reason: ${platformUserResponse.error}`);
      res.status(401).json({ success: false, error: platformUserResponse.error || 'Authentication failed: Invalid or expired platformUser token.' });
      return; // Stop processing
    }
  } catch (error) {
    // Catch any unexpected errors during the validation process
    console.error(`[Auth Middleware] Internal server error during authentication for path ${req.path}:`, error);
    res.status(500).json({ success: false, error: 'Internal server error during authentication.' });
    return; // Stop processing
  }
} 