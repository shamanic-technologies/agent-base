/**
 * Authentication Middleware
 * 
 * Validates JWT tokens, populates req.user, and adds user headers for downstream services
 */
import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { tokenCache } from '../utils/token-cache';
import { User } from '../types';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

// Add diagnostic logging for environment variables
console.log('[Auth Middleware] Environment variables:');
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`AUTH_SERVICE_URL: ${process.env.AUTH_SERVICE_URL}`);
console.log(`DB_SERVICE_URL: ${process.env.DB_SERVICE_URL}`);

// Try to load environment variables manually as a fallback
if (!process.env.AUTH_SERVICE_URL && process.env.NODE_ENV !== 'production') {
  const envFile = path.resolve(process.cwd(), '.env.local');
  console.log(`[Auth Middleware] Attempting to load environment from ${envFile}`);
  
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile });
    console.log(`[Auth Middleware] Loaded environment variables from ${envFile}`);
    console.log(`AUTH_SERVICE_URL after loading: ${process.env.AUTH_SERVICE_URL}`);
  }
}

// Get auth service URL from environment variables
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3005';
const JWT_SECRET = process.env.JWT_SECRET || 'helloworld_jwt_secret_key';

// Keep a debug message but allow the server to start
console.log(`[Auth Middleware] Using AUTH_SERVICE_URL: ${AUTH_SERVICE_URL}`);
console.log(`[Auth Middleware] Using JWT_SECRET: ${JWT_SECRET ? '(secret masked)' : 'NOT SET'}`);

// Define endpoints that should skip authentication
const SKIP_AUTH_PATHS = [
  '/health',
  '/auth/logout',
  '/oauth/google',
  '/oauth/google/callback'
];

/**
 * Extract token from Authorization header
 * @param authHeader Authorization header value
 * @returns Token string or undefined if invalid
 */
function extractToken(authHeader: string | undefined): string | undefined {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return undefined;
  }
  
  const token = authHeader.split(' ')[1];
  return token || undefined;
}

/**
 * Decode JWT token to extract user information
 * This is used as a fallback when the auth service doesn't return user ID
 */
function decodeToken(token: string): { userId?: string, email?: string, name?: string } {
  try {
    // Decode the token without verification to extract the payload
    const decoded = jwt.decode(token) as any;
    console.log('[Auth Middleware] Decoded token payload:', JSON.stringify(decoded));
    
    if (!decoded) return {};
    
    // Extract userId from common JWT fields (sub or id)
    const userId = decoded.sub || decoded.id;
    console.log(`[Auth Middleware] Extracted userId from token: ${userId || 'NONE'}`);
    
    return {
      userId,
      email: decoded.email,
      name: decoded.name
    };
  } catch (error) {
    console.error('[Auth Middleware] Error decoding token:', error);
    return {};
  }
}

/**
 * Validate token with auth service
 * @param token JWT token to validate
 * @returns User object if token is valid, undefined otherwise
 */
async function validateToken(token: string): Promise<User | undefined> {
  try {
    // Check cache first
    const cachedUser = tokenCache.get(token);
    if (cachedUser) {
      console.log(`[Auth Middleware] Using cached token validation`);
      return cachedUser;
    }
    
    console.log(`[Auth Middleware] Validating token with auth service at ${AUTH_SERVICE_URL}`);
    
    // Decode the token locally to extract basic information
    const { userId: decodedUserId, email: decodedEmail, name: decodedName } = decodeToken(token);
    console.log(`[Auth Middleware] Decoded from token - userId: ${decodedUserId || 'NONE'}, email: ${decodedEmail || 'NONE'}`);
    
    // Call auth service for validation
    console.log(`[Auth Middleware] Sending token to auth service for validation`);
    const response = await axios({
      method: 'POST',
      url: `${AUTH_SERVICE_URL}/auth/validate`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      data: {}
    });
    
    // Detailed logging of the response
    console.log('[Auth Middleware] Token validation response:', JSON.stringify(response.data));
    
    // Check if response indicates successful validation
    if (response.data?.success && response.data?.data) {
      // Extract user ID from the response (use sub as the primary identifier, fallback to id)
      // If both are missing, fallback to the decoded token value
      const userId = response.data.data.sub || response.data.data.id || decodedUserId;
      
      console.log(`[Auth Middleware] Extracted user ID from response: ${userId || 'NONE'}`);
      console.log(`[Auth Middleware] Full response data:`, JSON.stringify(response.data.data));
      
      if (!userId) {
        console.error('[Auth Middleware] Token validation succeeded but no user ID found in response or token');
        return undefined;
      }
      
      const user: User = {
        id: userId,
        email: response.data.data.email || decodedEmail || '',
        name: response.data.data.name || decodedName || '',
        picture: response.data.data.picture
      };
      
      // Cache the validated token
      tokenCache.set(token, user);
      console.log(`[Auth Middleware] Created user object with ID ${user.id}`);
      
      return user;
    }
    
    console.log('[Auth Middleware] Token validation failed: Invalid response');
    return undefined;
  } catch (error) {
    console.error('[Auth Middleware] Token validation error:', error);
    return undefined;
  }
}

/**
 * Express middleware that validates JWT tokens and populates req.user
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip authentication for certain paths
  if (SKIP_AUTH_PATHS.some(path => req.path.startsWith(path))) {
    return next();
  }
  
  // Get Authorization header
  const token = extractToken(req.headers.authorization);
  
  // If no token, continue without authentication
  if (!token) {
    console.log(`[Auth Middleware] No token provided for ${req.path}`);
    return next();
  }
  
  try {
    // Validate token and get user information
    const user = await validateToken(token);
    
    if (user) {
      // Populate req.user for use in gateway logic
      req.user = user;
      
      // Add user headers for downstream services
      req.headers['x-user-id'] = user.id;
      req.headers['x-user-email'] = user.email;
      
      console.log(`[Auth Middleware] Authenticated user ${user.id} for ${req.path}`);
    }
  } catch (error) {
    console.error(`[Auth Middleware] Error processing token:`, error);
    // Continue without authentication on error
  }
  
  next();
} 