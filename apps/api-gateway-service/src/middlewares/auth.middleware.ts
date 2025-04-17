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
  PlatformUserId
} from '@agent-base/api-client'; 
import { ServiceResponse, ClientUser } from '@agent-base/types';

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

      // Validate the API key and get user information (platformUserId string)
      const validationResponse: ServiceResponse<PlatformUserId> = await validatePlatformApiKeySecret(platformApiKey); 
      
      // Check for valid status and presence of data (which is the platformUserId string)
      if (!validationResponse.success || !validationResponse.data) { 
        console.log(`[Auth Middleware] Invalid API key`);
        // Use the specific error from the validation response if available
        return res.status(401).json(validationResponse || { success: false, error: 'Invalid API Key' });
      }

      // validationResponse.data IS the platformUserId string
      const platformUserId: string = validationResponse.data;
      (req as any).platformUserId = platformUserId; // Store on request
      req.headers['x-platform-user-id'] = platformUserId; // Set header for downstream
      console.log(`[Auth Middleware] Authenticated platform user ${platformUserId}`);

      // 2. Platform Client User ID Validation (Optional)
      const platformClientUserId = req.headers['x-platform-client-user-id'] as string;
      
      if (platformClientUserId) {
        console.log(`[Auth Middleware] Found x-platform-client-user-id: ${platformClientUserId}. Validating/upserting...`);
        
        // Prepare input for the client user upsert function
        // Both platformUserId (string) and platformClientUserId (string) are needed
        const upsertInput = { platformUserId, platformClientUserId };

        // Call the client user upsert API
        // Pass the input object AND the platformUserId string for auth
        const clientUserResponse: ServiceResponse<ClientUser> = await upsertClientUserApiClient(upsertInput, platformClientUserId, platformUserId);

        if (!clientUserResponse.success || !clientUserResponse.data || !clientUserResponse.data.id) {
          console.error(`[Auth Middleware] Failed to validate/upsert client user ID ${platformClientUserId} for platform user ${platformUserId}. Error: ${clientUserResponse.error}`);
          return res.status(401).json({
            success: false,
            error: 'Invalid or failed validation for x-platform-client-user-id',
            details: clientUserResponse.error || 'Could not validate the provided client user identifier.'
          });
        }

        // Extract the internal client user ID (UUID)
        const clientUserId = clientUserResponse.data.id;
        (req as any).clientUserId = clientUserId; // Store on request object if needed elsewhere in gateway
        req.headers['x-client-user-id'] = clientUserId; // Set header for downstream services
        console.log(`[Auth Middleware] Validated client user. Internal ID: ${clientUserId}`);

      } else {
        console.log(`[Auth Middleware] No x-platform-client-user-id header found. Proceeding without client user context.`);
        // Optionally, remove any existing x-client-user-id header if it shouldn't be passed
        delete req.headers['x-client-user-id']; 
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