/**
 * OAuth Routes
 * 
 * Routes for OAuth authentication flows
 */
import { Router } from 'express';
import passport from '../utils/passport';
import { 
  authSuccessHandler, 
  authFailureHandler 
} from '../controllers/oauth.controller';
import { config } from '../config/env';

const router = Router();

// Google OAuth login route
router.get('/google', (req, res, next) => {
  // Get the origin URL from the referer or query parameter
  const originParam = req.query.origin || req.headers.referer || '';
  const origin = typeof originParam === 'string' ? originParam : '';
  
  // Start Google OAuth authentication with state parameter to store origin
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    state: origin
  })(req, res, next);
});

// Google OAuth callback
router.get('/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: '/oauth/failure',
    session: false
  }),
  authSuccessHandler
);

// Auth failure handler
router.get('/failure', authFailureHandler);

export default router; 