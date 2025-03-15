/**
 * Authentication Routes
 * 
 * Routes for core authentication operations (simplified)
 */
import { Router } from 'express';
import { 
  validateTokenHandler,
  refreshTokenHandler,
  logoutHandler
} from '../controllers/auth.controller';

const router = Router();

// Authentication routes
router.post('/validate', validateTokenHandler);
router.post('/refresh', refreshTokenHandler);
router.post('/logout', logoutHandler);

export default router; 