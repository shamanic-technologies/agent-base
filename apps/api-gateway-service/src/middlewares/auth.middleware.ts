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
  upsertClientOrganizationApiClient,
  validateClientUserClientOrganization,
} from '@agent-base/api-client'; 
import { ServiceResponse, ClientUser, PlatformUserId, SecretValue, ClientOrganization } from '@agent-base/types';
import { apiCache } from '../utils/api-cache.js'; // Import the API cache

// Define a list of public paths that should bypass API key validation
const PUBLIC_PATHS = [
  '/payment/webhook', // Stripe webhook needs to be public
  // Add other public paths here, e.g., '/health'
];

/**
 * Authentication middleware factory that returns a middleware function
 * The middleware validates API keys, potentially upserts client users,
 * and populates req.userId and req.clientUserId (if applicable).
 * Also adds relevant headers for downstream services.
 */
export const authMiddleware = () => { 
  return async (req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> => {
    // Bypass auth for public paths
    if (PUBLIC_PATHS.includes(req.path)) {
      return next();
    }

    try {
      let clientUserId: string | undefined;
      let clientOrganizationId: string | undefined;
      // 1. Platform API Key Validation
      const platformApiKey = req.headers['x-platform-api-key'] as string;
      req.platformApiKey = platformApiKey; 
      
      if (!platformApiKey) {
        console.log(`[Auth Middleware] No API key provided`);
        res.status(401).json({
          success: false,
          error: 'API Gateway Service: API key is required. Please use the X-PLATFORM-API-KEY header.'
        });
        return;
      }

      let platformUserId: string | undefined = apiCache.getPlatformUserId(platformApiKey);

      if (!platformUserId) {

        const platformApiKeySecret: SecretValue = {
          value: platformApiKey
        };
        // Define the expected success data shape locally if not exported correctly
        const validationResponse: ServiceResponse<PlatformUserId> = await validatePlatformApiKeySecret(platformApiKeySecret);
        console.debug('⚠️⚠️⚠️validationResponse in authMiddleware:', JSON.stringify(validationResponse, null, 2));
        console.debug('⚠️⚠️⚠️ Is it a PlatformUserId or APIKey?');
        // Check for validation success first
        if (validationResponse.success) {
          // Extract the platform user ID
          platformUserId = validationResponse.data.platformUserId;
          // Cache the successful result
          apiCache.setPlatformUserId(platformApiKey, platformUserId);
        } else {
          console.log(`[Auth Middleware] Key validation failed: ${validationResponse.error}`);
          res.status(401).json(validationResponse); // Return the original error response
          return;
        }
      }
      
      // Assign platformUserId to request and headers
      req.platformUserId = platformUserId; 
      req.headers['x-platform-user-id'] = platformUserId;

      // 2. Client User ID Handling (Internal vs. External)
      clientUserId = req.headers['x-client-user-id'] as string;
      const clientAuthUserId = req.headers['x-client-auth-user-id'] as string;

      if (!clientUserId && clientAuthUserId) {
        // External call: clientAuthUserId needs to be resolved to our internal clientUserId
        const cachedClientUserId = apiCache.getClientUserId(platformUserId, clientAuthUserId);

        if (cachedClientUserId) {
          clientUserId = cachedClientUserId;
        } else {
          console.log(`[Auth Middleware] Client User Cache MISS for ${platformUserId}:${clientAuthUserId}. Validating/upserting...`);
          
          const clientUserResponse: ServiceResponse<ClientUser> = await upsertClientUserApiClient(
            clientAuthUserId, 
            platformUserId
          );

          if (clientUserResponse.success) {
            clientUserId = clientUserResponse.data.id;
            apiCache.setClientUserId(platformUserId, clientAuthUserId, clientUserId);
          } else {
            console.error(`[Auth Middleware] Failed to validate/upsert client user ID ${clientAuthUserId} for platform user ${platformUserId}. Error: ${clientUserResponse.error}`);
            res.status(401).json(clientUserResponse);
            return;
          }
        }
      }

      if (clientUserId) {
        // Assign clientUserId to request and headers for downstream services
        req.clientUserId = clientUserId; 
        req.headers['x-client-user-id'] = clientUserId;
      }

      // 3. Client Organization ID Handling (Internal vs. External)
      clientOrganizationId = req.headers['x-client-organization-id'] as string;
      const clientAuthOrganizationId = req.headers['x-client-auth-organization-id'] as string;
      
      if (!clientOrganizationId && clientAuthOrganizationId) {
        // External call: clientAuthOrganizationId needs to be resolved to our internal clientOrganizationId
        const cachedClientOrganizationId = apiCache.getClientOrganizationId(platformUserId, clientAuthOrganizationId);

        if (cachedClientOrganizationId) {
          clientOrganizationId = cachedClientOrganizationId;
        } else {
          console.log(`[Auth Middleware] Client Organization Cache MISS for ${platformUserId}:${clientAuthOrganizationId}. Validating/upserting...`);

          if (!clientUserId) {
            console.error(`[Auth Middleware] Cannot upsert organization without a clientUserId.`);
            res.status(400).json({ success: false, error: "Cannot process organization without a user context." });
            return;
          }
          
          const clientOrganizationResponse: ServiceResponse<ClientOrganization> = await upsertClientOrganizationApiClient(
            clientUserId, 
            clientAuthOrganizationId,
          );

          if (clientOrganizationResponse.success) {
            clientOrganizationId = clientOrganizationResponse.data.id;
            apiCache.setClientOrganizationId(platformUserId, clientAuthOrganizationId, clientOrganizationId);
          } else {
            console.error(`[Auth Middleware] Failed to validate/upsert client organization ID ${clientAuthOrganizationId} for platform user ${platformUserId}. Error: ${clientOrganizationResponse.error}`);
            res.status(401).json(clientOrganizationResponse);
            return;
          }
        }
      }

      if (clientOrganizationId) {
        // Assign clientOrganizationId to request and headers for downstream services
        req.clientOrganizationId = clientOrganizationId; 
        req.headers['x-client-organization-id'] = clientOrganizationId;
      }

      // 4. Client+Organization Validation (Optional)
      // TODO: Implement this

      // if (clientUserId && clientOrganizationId) {
      //   let clientUserClientOrganizationValidation: boolean | undefined = apiCache.getClientUserClientOrganizationValidation(clientUserId, clientOrganizationId);

      //   if (!clientUserClientOrganizationValidation) {

      //     // Check if the client user is associated with the client organization
      //     const clientUserOrganizationResponse: ServiceResponse<boolean> = await validateClientUserClientOrganization(
      //       platformApiKey,
      //       platformUserId,
      //       clientUserId,
      //       clientOrganizationId
      //     );
      //     if (!clientUserOrganizationResponse.success) {
      //       console.error(`[Auth Middleware] Failed to validate client user ${clientUserId} is associated with client organization ${clientOrganizationId}. Error: ${clientUserOrganizationResponse.error}`);
      //       res.status(401).json(clientUserOrganizationResponse);
      //       return;
      //     }
      //     apiCache.setClientUserClientOrganizationValidation(clientUserId, clientOrganizationId, true);
        
      //   }
      // }
      // Proceed to next middleware/route handler
      next();
    } catch (error) {
      console.error(`[Auth Middleware] Unexpected error in middleware execution:`, error); 
      res.status(500).json({
        success: false,
        error: 'API Gateway Service: Internal authentication processing error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
      return;
    }
  };
};
