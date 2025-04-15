/**
 * Authentication Controller
 * 
 * Handles token validation, refresh, and logout for Passport.js authentication
 */
import { AsyncRequestHandler } from '../utils/types';
import { config } from '../config/env';
import { verifyToken, generateToken } from '../utils/passport';
import passport from '../utils/passport';

/**
 * Validate the user's token
 * Only uses Authorization Bearer header
 */
export const validateTokenHandler: AsyncRequestHandler = async (req, res) => {
  // Extract token from Authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[Auth Service] No valid Authorization header found');
    return res.status(401).json({
      success: false,
      error: 'No valid Authorization header found'
    });
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  if (!token) {
    console.log('[Auth Service] No token provided for validation');
    return res.status(401).json({
      success: false,
      error: 'No token provided'
    });
  }
  
  console.log('[Auth Service] Token validation attempt with token length:', token.length);
  
  // Validate token using passport jwt strategy
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      console.error('[Auth Service] Error in JWT validation:', err);
      return res.status(500).json({
        success: false,
        error: 'Server error'
      });
    }
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }
    
    // User is authenticated
    return res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture
      }
    });
  })(req, res);
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