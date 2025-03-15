/**
 * OAuth Routes
 * 
 * Routes for OAuth authentication flows
 */
import { Router } from 'express';
import { 
  googleAuthHandler,
  authCallbackHandler,
  setCookiesHandler
} from '../controllers/oauth.controller';

const router = Router();

// OAuth routes
router.get('/google', googleAuthHandler);
router.get('/callback', authCallbackHandler);
router.post('/set-cookies', setCookiesHandler);

export default router; 