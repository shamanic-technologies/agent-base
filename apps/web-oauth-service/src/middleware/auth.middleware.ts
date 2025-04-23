/**
 * Authentication Middleware
 * 
 * Provides middleware functions for authenticating requests
 */
import { Request, Response, NextFunction } from 'express';
import passport from '../utils/passport';

/**
 * Require authentication for protected routes
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      console.error('Error in JWT authentication:', err);
      return res.status(500).json({
        success: false,
        error: 'Authentication error'
      });
    }
    
    if (!user) {
      console.log('User is missing from authentication middleware');
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }
    
    // Set user on request for downstream handlers
    req.user = user;
    return next();
  })(req, res, next);
}; 