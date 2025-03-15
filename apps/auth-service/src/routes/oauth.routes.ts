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

const router = Router();

// Google OAuth login route
router.get('/google', passport.authenticate('google', { 
  scope: ['profile', 'email'] 
}));

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