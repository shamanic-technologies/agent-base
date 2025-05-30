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

/**
 * Authentication middleware factory that returns a middleware function
 * The middleware validates API keys, potentially upserts client users,
 * and populates req.userId and req.clientUserId (if applicable).
 * Also adds relevant headers for downstream services.
 */
export const authMiddleware = () => { 
  return async (req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> => {
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
        console.log('platformApiKeySecret in authMiddleware:', JSON.stringify(platformApiKeySecret, null, 2));
        // Define the expected success data shape locally if not exported correctly
        const validationResponse: ServiceResponse<PlatformUserId> = await validatePlatformApiKeySecret(platformApiKeySecret);

        // Check for validation success first
        if (!validationResponse.success ) {
          console.log(`[Auth Middleware] Key validation failed: ${validationResponse.error}`);
          res.status(401).json(validationResponse); // Return the original error response
          return;
        }
        // Extract the platform user ID
        platformUserId = validationResponse.data.platformUserId;
        // Cache the successful result
        apiCache.setPlatformUserId(platformApiKey, platformUserId);

      }
      
      // Assign platformUserId to request and headers
      req.platformUserId = platformUserId; 
      req.headers['x-platform-user-id'] = platformUserId;

      // 2. Client Auth User ID Validation (Optional)
      const clientAuthUserId = req.headers['x-client-auth-user-id'] as string;
      const clientAuthOrganizationId = req.headers['x-client-auth-organization-id'] as string;
      
      if (clientAuthUserId) {

        clientUserId = apiCache.getClientUserId(platformUserId, clientAuthUserId);

        if (!clientUserId) {
          console.log(`[Auth Middleware] Client User Cache MISS for ${platformUserId}:${clientAuthUserId}. Validating/upserting...`);
          
          const clientUserResponse: ServiceResponse<ClientUser> = await upsertClientUserApiClient(
            clientAuthUserId, 
            clientAuthOrganizationId,
            platformUserId // Pass the correct string ID here
          );

          if (!clientUserResponse.success) {
            console.error(`[Auth Middleware] Failed to validate/upsert client user ID ${clientAuthUserId} for platform user ${platformUserId}. Error: ${clientUserResponse.error}`);
            res.status(401).json(clientUserResponse);
            return;
          }

          // Extract the internal client user ID (UUID)
          clientUserId = clientUserResponse.data.id;
          // Cache the successful result
          apiCache.setClientUserId(platformUserId, clientAuthUserId, clientUserId);
        
        }

        // Assign clientUserId to request and headers
        req.clientUserId = clientUserId; 
        req.headers['x-client-user-id'] = clientUserId;
      }

      // 3. Client Auth Organization ID Validation (Optional)

      if (clientAuthOrganizationId) {

        clientOrganizationId = apiCache.getClientOrganizationId(platformUserId, clientAuthOrganizationId);

        if (!clientOrganizationId) {
          console.log(`[Auth Middleware] Client Organization Cache MISS for ${platformUserId}:${clientAuthOrganizationId}. Validating/upserting...`);
          
          const clientOrganizationResponse: ServiceResponse<ClientOrganization> = await upsertClientOrganizationApiClient(
            clientAuthUserId, 
            clientAuthOrganizationId,
            platformUserId // Pass the correct string ID here
          );

          if (!clientOrganizationResponse.success) {
            console.error(`[Auth Middleware] Failed to validate/upsert client organization ID ${clientAuthOrganizationId} for platform user ${platformUserId}. Error: ${clientOrganizationResponse.error}`);
            res.status(401).json(clientOrganizationResponse);
            return;
          }

          // Extract the internal client user ID (UUID)
          clientOrganizationId = clientOrganizationResponse.data.id;
          // Cache the successful result
          apiCache.setClientOrganizationId(platformUserId, clientAuthOrganizationId, clientOrganizationId);
        
        }

        // Assign clientUserId to request and headers
        req.clientOrganizationId = clientOrganizationId; 
        req.headers['x-client-organization-id'] = clientOrganizationId;

      }

      // 4. Client+Organization Validation (Optional)
      if (clientUserId && clientOrganizationId) {
        let clientUserClientOrganizationValidation: boolean | undefined = apiCache.getClientUserClientOrganizationValidation(clientUserId, clientOrganizationId);

        if (!clientUserClientOrganizationValidation) {

          // Check if the client user is associated with the client organization
          const clientUserOrganizationResponse: ServiceResponse<boolean> = await validateClientUserClientOrganization(
            platformApiKey,
            platformUserId,
            clientUserId,
            clientOrganizationId
          );
          if (!clientUserOrganizationResponse.success) {
            console.error(`[Auth Middleware] Failed to validate client user ${clientUserId} is associated with client organization ${clientOrganizationId}. Error: ${clientUserOrganizationResponse.error}`);
            res.status(401).json(clientUserOrganizationResponse);
            return;
          }
          apiCache.setClientUserClientOrganizationValidation(clientUserId, clientOrganizationId, true);
        
        }
      }
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
