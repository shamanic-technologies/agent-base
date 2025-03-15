/**
 * Authentication Middleware
 * 
 * Middleware functions for authentication and authorization
 */
import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../utils/supabase';

/**
 * Verify that a request is authenticated
 * Looks for a token in the Authorization header or cookies
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from authorization header or cookies
    let token = '';
    
    if (req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    
    if (!token && req.cookies['sb-access-token']) {
      token = req.cookies['sb-access-token'];
    }
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    // Validate token with Supabase
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !data.user) {
      return res.status(401).json({
        success: false,
        error: error?.message || 'Invalid token'
      });
    }
    
    // Add user to request object for use in route handlers
    (req as any).user = data.user;
    
    next();
  } catch (error: any) {
    console.error('Auth middleware error:', error);
    
    return res.status(401).json({
      success: false,
      error: error.message || 'Authentication failed'
    });
  }
}; 