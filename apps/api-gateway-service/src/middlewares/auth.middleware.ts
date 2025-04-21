/**
 * Authentication Middleware
 * 
 * Validates API keys, optionally validates client user IDs, and populates request headers.
 * Sets x-platform-user-id and potentially x-client-user-id headers for downstream services.
 */
import express from 'express';
// Import API client functions for key and client user validation
import { 
  validatePlatformApiKeySecret, 
  upsertClientUserApiClient,
} from '@agent-base/api-client'; 
import { ServiceResponse, ClientUser, PlatformUserId, PlatformAPIKeySecret } from '@agent-base/types';
import { apiCache } from '../utils/api-cache.js'; // Import the API cache

/**
 * Authentication middleware factory that returns a middleware function
 * The middleware validates API keys, potentially upserts client users,
 * and populates req.userId and req.clientUserId (if applicable).
 * Also adds relevant headers for downstream services.
 */
export const authMiddleware = () => { 
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      console.log(`[Auth Middleware] Entering auth middleware for ${req.path}`);
      
      // 1. Platform API Key Validation
      const platformApiKey = req.headers['x-platform-api-key'] as string;
      (req as any).platformApiKey = platformApiKey; 
      console.log(`[Auth Middleware] API key snippet: ${platformApiKey ? platformApiKey.substring(0, 5) + '...' : 'Not provided'}`);
      
      if (!platformApiKey) {
        console.log(`[Auth Middleware] No API key provided`);
        return res.status(401).json({
          success: false,
          error: 'API Gateway Service: API key is required. Please use the X-PLATFORM-API-KEY header.'
        });
      }

      let platformUserId: string | undefined = apiCache.getPlatformUserId(platformApiKey);

      if (!platformUserId) {

        const platformApiKeySecret: PlatformAPIKeySecret = {
          platformAPIKeySecret: platformApiKey
        };
        // Define the expected success data shape locally if not exported correctly
        const validationResponse: ServiceResponse<PlatformUserId> = await validatePlatformApiKeySecret(platformApiKeySecret);

        // Check for validation success first
        if (!validationResponse.success ) {
          console.log(`[Auth Middleware] Key validation failed: ${validationResponse.error}`);
          return res.status(401).json(validationResponse); // Return the original error response
        }
        // Extract the platform user ID
        platformUserId = validationResponse.data.platformUserId;
        // Cache the successful result
        apiCache.setPlatformUserId(platformApiKey, platformUserId);
        console.log(`[Auth Middleware] API Key validated via service. User ID: ${platformUserId}`);

      }
      
      // Assign platformUserId to request and headers
      (req as any).platformUserId = platformUserId; 
      req.headers['x-platform-user-id'] = platformUserId;
      console.log(`[Auth Middleware] Authenticated platform user ${platformUserId}`);

      // 2. Platform Client User ID Validation (Optional)
      const platformClientUserId = req.headers['x-platform-client-user-id'] as string;
      
      if (platformClientUserId) {
        console.log(`[Auth Middleware] Found x-platform-client-user-id: ${platformClientUserId}. Checking cache/validating...`);

        let clientUserId: string | undefined = apiCache.getClientUserId(platformUserId, platformClientUserId);

        if (!clientUserId) {
          console.log(`[Auth Middleware] Client User Cache MISS for ${platformUserId}:${platformClientUserId}. Validating/upserting...`);
          
          const clientUserResponse: ServiceResponse<ClientUser> = await upsertClientUserApiClient(
            platformClientUserId, 
            platformUserId // Pass the correct string ID here
          );

          if (!clientUserResponse.success) {
            console.error(`[Auth Middleware] Failed to validate/upsert client user ID ${platformClientUserId} for platform user ${platformUserId}. Error: ${clientUserResponse.error}`);
            return res.status(401).json(clientUserResponse);
          }

          // Extract the internal client user ID (UUID)
          clientUserId = clientUserResponse.data.id;
          // Cache the successful result
          apiCache.setClientUserId(platformUserId, platformClientUserId, clientUserId);
          console.log(`[Auth Middleware] Client user validated/upserted via service. Internal ID: ${clientUserId}`);
        
        } else {
            console.log(`[Auth Middleware] Client User Cache HIT. Internal ID: ${clientUserId}`);
        }

        // Assign clientUserId to request and headers
        (req as any).clientUserId = clientUserId; 
        req.headers['x-client-user-id'] = clientUserId;
        console.log(`[Auth Middleware] Authenticated client user. Internal ID: ${clientUserId}`);

      }

      // Proceed to next middleware/route handler
      console.log(`[Auth Middleware] Authentication successful for ${req.path}`);
      next();
    } catch (error) {
      console.error(`[Auth Middleware] Unexpected error in middleware execution:`, error); 
      return res.status(500).json({
        success: false,
        error: 'API Gateway Service: Internal authentication processing error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
};
