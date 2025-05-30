/**
 * User Routes
 *
 * Routes for user-related operations.
 */
import { Router } from 'express';
import { 
  validatePlatformAuthUserHandler
} from '../controllers/platform-user.controller';
import {
  validateClientUserHandler
} from '../controllers/client-user.controller';

const router = Router();

// User routes
router.post('/validate-platform-user', validatePlatformAuthUserHandler);
router.post('/validate-client-user', validateClientUserHandler);

export default router;