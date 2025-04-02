/**
 * Authentication Middleware
 * 
 * Validates API keys against the key service and populates request with user information.
 * Sets headers for downstream services.
 */
import express from 'express';
import axios from 'axios';
import { User } from '../types/index.js';

/**
 * Validates an API key with the key service
 * Returns the validation result and user information if valid
 */
const validateApiKey = async (apiKey: string, keyServiceUrl: string): Promise<{valid: boolean, user?: User}> => {
  try {
    console.log(`[Auth Middleware] Validating API key with Key Service`);
    const response = await axios.post(`${keyServiceUrl}/keys/validate`, { apiKey });
    
    if (response.data.success && response.data.data?.userId) {
      console.log(`[Auth Middleware] API key valid for user ${response.data.data.userId}`);
      
      // Create user object from validation response
      const user: User = {
        id: response.data.data.userId,
        email: response.data.data.email || 'unknown@example.com',
        name: response.data.data.name || 'API User',
        provider: 'api-key'
      };
      
      return {
        valid: true,
        user
      };
    }
    
    console.log(`[Auth Middleware] API key validation failed or missing userId`);
    return { valid: false };
  } catch (error) {
    console.error('[Auth Middleware] Error validating API key:', error);
    throw error; // Re-throw to be handled by caller
  }
};

/**
 * Authentication middleware factory that returns a middleware function
 * The middleware validates API keys and populates req.user
 * Also adds user headers for downstream services
 */
export const authMiddleware = (keyServiceUrl: string) => {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      console.log(`[Auth Middleware] Entering auth middleware`);
      // Extract API key from X-API-KEY header only
      const apiKey = req.headers['x-api-key'] as string;
      console.log(`[Auth Middleware] API key: ${apiKey}`);
      
      // Check for deprecated Authorization header usage
      // if (req.headers['authorization']) {
      //   console.error(`[Auth Middleware] Client using deprecated Authorization header for ${req.path}`);
      //   return res.status(401).json({
      //     success: false,
      //     error: 'API Gateway Service: Authorization header is not supported. Please use the X-API-KEY header instead.'
      //   });
      // }
      
      if (!apiKey) {
        console.log(`[Auth Middleware] No API key provided for ${req.path}`);
        return res.status(401).json({
          success: false,
          error: 'API Gateway Service: API key is required. Please use the X-API-KEY header.'
        });
      }
      
      // Store the API key in the request for downstream handlers
      req.apiKey = apiKey;
      
      // Validate the API key and get user information
      const validation = await validateApiKey(apiKey, keyServiceUrl);
      
      if (!validation.valid || !validation.user) {
        console.log(`[Auth Middleware] Invalid API key for ${req.path}`);
        return res.status(401).json({
          success: false,
          error: 'API Gateway Service: Invalid API key'
        });
      }
      
      // Set user object on request
      req.user = validation.user;
      
      // Add user headers for downstream services
      req.headers['x-user-id'] = validation.user.id;
      if (validation.user.email) req.headers['x-user-email'] = validation.user.email;
      if (validation.user.name) req.headers['x-user-name'] = validation.user.name;
      if (validation.user.provider) req.headers['x-user-provider'] = validation.user.provider;
      
      console.log(`[Auth Middleware] Authenticated user ${validation.user.id} for ${req.path}`);
      next();
    } catch (error) {
      console.error(`[Auth Middleware] Error processing API key:`, error);
      return res.status(500).json({
        success: false,
        error: 'API Gateway Service: Authentication error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}; 