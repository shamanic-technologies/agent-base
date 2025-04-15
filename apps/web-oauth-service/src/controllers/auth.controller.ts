/**
 * Authentication Controller
 * 
 * Handles token validation, refresh, and logout for Passport.js authentication
 */
import { AsyncRequestHandler } from '../utils/types';
import { config } from '../config/env';
import { verifyToken, generateToken } from '../utils/passport';
import passport from '../utils/passport';
import { PlatformUser, ServiceResponse, JWTPayload } from '@agent-base/types';
import { getUserFromDatabase } from '../utils/database';

/**
 * Validate the user's token
 * Reads token from httpOnly cookie
 */
export const validateTokenHandler: AsyncRequestHandler = async (req, res) => {
  // Extract token from the httpOnly cookie
  const token = req.cookies['auth-token'];
  
  if (!token) {
    console.log('[Auth Service] No auth-token cookie found for validation');
    return res.status(401).json({
      success: false,
      error: 'No token provided' // Keep error message generic
    });
  }
  
  console.log('[Auth Service] Token validation attempt via cookie, token length:', token.length);
  
  // Validate token using passport jwt strategy
  // Note: Passport's jwt strategy defaults to Authorization header.
  // We manually verify here for simplicity and consistency with /refresh.
  const userData = verifyToken(token);

  if (!userData) {
    // verifyToken already logs the specific reason (e.g., expired)
    console.log('[Auth Service] Token validation failed (likely expired or invalid)');
    return res.status(401).json({
      success: false,
      error: 'Not authenticated' // Generic error
    });
  }

  // Token is valid, userData contains { userId }
  // Now fetch the full user profile from the database
  try {
    const dbResponse: ServiceResponse<PlatformUser> = await getUserFromDatabase(userData.userId);

    if (!dbResponse.success || !dbResponse.data) {
      console.error(`[Auth Service] Valid token for userId ${userData.userId}, but user not found in DB.`);
      // This case is unusual - token valid but user doesn't exist?
      // Respond with 401 as the user effectively cannot be fully authenticated.
      return res.status(401).json({
        success: false,
        error: 'User associated with token not found'
      });
    }

    // User is fully authenticated and data retrieved
    console.log(`[Auth Service] User ${userData.userId} validated successfully.`);
    return res.json({
      success: true,
      data: dbResponse.data // Return the full PlatformUser object
    });

  } catch (dbError: any) {
    console.error(`[Auth Service] Error fetching user data from DB for userId ${userData.userId}:`, dbError);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve user data'
    });
  }
};

/**
 * Refresh the user's token
 */
export const refreshTokenHandler: AsyncRequestHandler = async (req, res) => {
  try {
    const token = req.cookies['auth-token'];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token'
      });
    }

    // Verify existing token
    const userData = verifyToken(token);
    
    if (!userData) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
    
    // Generate a new token
    const newToken = generateToken(userData);
    
    // Set the new token as cookie
    res.cookie('auth-token', newToken, {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'lax',
      path: '/'
    });
    
    return res.json({
      success: true
    });
  } catch (error: any) {
    console.error('Error refreshing token:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

/**
 * Log the user out
 */
export const logoutHandler: AsyncRequestHandler = async (req, res) => {
  try {
    // Clear auth token cookie
    res.clearCookie('auth-token', {
      path: '/',
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'lax'
    });
    
    // Logout from passport session if exists
    if (req.logout) {
      req.logout(() => {});
    }
    
    return res.json({
      success: true
    });
  } catch (error: any) {
    console.error('Error logging out:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
}; 