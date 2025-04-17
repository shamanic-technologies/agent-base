/**
 * Authentication Middleware
 * 
 * Validates API keys against the key service and populates request with user information.
 * Sets headers for downstream services.
 */
import express from 'express';
// import axios from 'axios'; // Removed axios import
// Import the key client function
import { validatePlatformApiKeySecret, PlatformUserId } from '@agent-base/api-client'; 
import { ServiceResponse } from '@agent-base/types';

/**
 * Authentication middleware factory that returns a middleware function
 * The middleware validates API keys and populates req.userId
 * Also adds the user ID header for downstream services
 */
// Removed keyServiceUrl parameter from the factory
export const authMiddleware = () => { 
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      console.log(`[Auth Middleware] Entering auth middleware`);
      // Get the platform API key from the request headers  
      const platformApiKey = req.headers['x-platform-api-key'] as string;
      // Store the platform API key in the request object 
      (req as any).platformApiKey = platformApiKey; 

      console.log(`[Auth Middleware] API key snippet: ${platformApiKey ? platformApiKey.substring(0, 5) + '...' : 'Not provided'}`); // Log snippet for security
      
      if (!platformApiKey) {
        console.log(`[Auth Middleware] No API key provided for ${req.path}`);
        return res.status(401).json({
          success: false,
          error: 'API Gateway Service: API key is required. Please use the X-API-KEY header.'
        });
      }

      // Validate the API key and get user information (now just userId)
      const validationResponse: ServiceResponse<PlatformUserId> = await validatePlatformApiKeySecret(platformApiKey); 
      
      // Check for valid status and presence of userId
      if (!validationResponse.success || !validationResponse.data) { 
        console.log(`[Auth Middleware] Invalid API key for ${req.path}`);
        return res.status(401).json(validationResponse);
      }

      // Store the platform user ID in the request object   
      (req as any).platformUserId = validationResponse.data.platformUserId; 
      
      // Add ONLY user ID header for downstream services
      req.headers['x-platform-user-id'] = validationResponse.data.platformUserId; 
      
      console.log(`[Auth Middleware] Authenticated user ${validationResponse.data.platformUserId} for ${req.path}`);
      next();
    } catch (error) {
      // Catch unexpected errors during middleware execution (e.g., issues setting headers)
      console.error(`[Auth Middleware] Unexpected error in middleware execution:`, error); 
      return res.status(500).json({
        success: false,
        error: 'API Gateway Service: Internal authentication processing error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}; 