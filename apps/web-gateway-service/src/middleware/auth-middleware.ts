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
import { makeServiceRequest } from '@agent-base/types'; 
import { tokenCache } from '../utils/token-cache'; 
import dotenv from 'dotenv';
import axios, { AxiosError } from 'axios'; // Re-add axios import with AxiosError type
// Removed fs and path as manual env loading is removed

// Load environment variables at the start (ideally done in index.ts)
// dotenv.config(); 

// Add diagnostic logging for environment variables
console.log('[Auth Middleware] Initializing...');
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`AUTH_SERVICE_URL: ${process.env.AUTH_SERVICE_URL}`);
console.log(`JWT_SECRET (Status): ${process.env.JWT_SECRET ? 'Set' : 'NOT SET - Using default'}`);

// Get auth service URL and JWT secret from environment variables
// Throw error if essential config is missing in production
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL;
// const JWT_SECRET = process.env.JWT_SECRET || 'helloworld_jwt_secret_key'; // Keep default for dev/test

if (process.env.NODE_ENV === 'production' && !AUTH_SERVICE_URL) {
  console.error('[Auth Middleware] CRITICAL ERROR: AUTH_SERVICE_URL is not defined in production environment.');
  // Optionally, exit the process or prevent the app from starting
  process.exit(1); 
}
if (!AUTH_SERVICE_URL) {
    console.warn('[Auth Middleware] WARNING: AUTH_SERVICE_URL is not defined. Using default: http://localhost:3005');
}
const authServiceUrl = AUTH_SERVICE_URL || 'http://localhost:3005';

console.log(`[Auth Middleware] Using AUTH_SERVICE_URL: ${authServiceUrl}`);

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
 * Validates the platformUser token by calling the Authentication Service.
 * Uses an in-memory cache to avoid repeated validation calls for the same token.
 * 
 * @param {string} platformUserToken - The JWT token to validate.
 * @returns {Promise<PlatformUser | undefined>} A promise resolving to the PlatformUser object if valid, otherwise undefined.
 */
async function validatePlatformUserToken(platformUserToken: string): Promise<ServiceResponse<PlatformUser>> {
  try {
    // Check cache first
    const cachedUser = tokenCache.get(platformUserToken);
    if (cachedUser) {
      console.log(`[Auth Middleware] Using cached validation for platformUser token.`);
      return {
        success: true,
        data: cachedUser as PlatformUser // Assume cache stores PlatformUser objects
      }
    }
    
    console.log(`[Auth Middleware] Validating platformUser token with auth service at ${authServiceUrl}`);
    
    // Use axios directly for the validation call
    const response = await axios.post<ServiceResponse<PlatformUser>>(
      `${authServiceUrl}/auth/validate`,
      {}, // Empty request body
      {
        headers: {
          'Authorization': `Bearer ${platformUserToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000 // Example: 5 second timeout
      }
    );

    console.log('[Auth Middleware] Token validation response received:', JSON.stringify(response.data));
    
    // Check if the auth service confirmed success and returned the expected data structure
    if (response.data.success && response.data.data) {
      const platformUser: PlatformUser = response.data.data;

      tokenCache.set(platformUserToken, platformUser);
      console.log(`[Auth Middleware] PlatformUser token validated successfully for user ID ${platformUser.id}. Caching result.`);
      return {
        success: true,
        data: platformUser
      };
    } else {
      console.log(`[Auth Middleware] PlatformUser token validation failed: ${response.data.error || 'Auth service did not return success or valid data.'}`);
      return {
        success: false,
        error: response.data.error || 'Auth service did not return success or valid data.'
      };
    }
  } catch (error) {
     // Check if it's an Axios error before accessing response/message
     if (axios.isAxiosError(error)) {
       console.error(`[Auth Middleware] Axios error during token validation: ${error.message}`, error.response?.data);
    } else if (error instanceof Error) { // Check if it's a generic Error
       console.error('[Auth Middleware] Non-Axios error during platformUser token validation:', error.message);
    } else {
       // Handle other types of errors (e.g., string exceptions)
       console.error('[Auth Middleware] Unknown error during platformUser token validation:', error);
    }
    return {
      success: false,
      error: 'Auth service did not return success or valid data.'
    };
  }
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
    console.log(`[Auth Middleware] Skipping auth for public path: ${req.path}`);
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
    // Validate the extracted token
    console.log(`[Auth Middleware] Attempting to validate token for path: ${req.path}`);
    const platformUserResponse = await validatePlatformUserToken(token);
    
    // If the token is valid and user information is retrieved
    if (platformUserResponse.success && platformUserResponse.data) {
      const platformUser = platformUserResponse.data;
      console.log(`[Auth Middleware] Authentication successful for user ${platformUser.id}. Path: ${req.path}`);

      req.platformUser = platformUser; 
      
      // Add user information as headers for downstream services
      req.headers['x-platform-user-id'] = platformUser.id;

      // Proceed to the next middleware or route handler
      next();
    } else {
      // If token validation fails (token is invalid, expired, or revoked)
      console.log(`[Auth Middleware] Invalid platformUser token for path: ${req.path}`);
      res.status(401).json({ success: false, error: 'Authentication failed: Invalid or expired platformUser token.' });
      return; // Stop processing
    }
  } catch (error) {
    // Catch any unexpected errors during the validation process
    console.error(`[Auth Middleware] Internal server error during authentication for path ${req.path}:`, error);
    res.status(500).json({ success: false, error: 'Internal server error during authentication.' });
    return; // Stop processing
  }
} 