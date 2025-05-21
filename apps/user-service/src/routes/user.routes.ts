/**
 * User Routes
 *
 * Routes for user-related operations.
 */
import { Router } from 'express';
import { 
  validatePlatformUserHandler
} from '../controllers/user.controller';

const router = Router();

// User routes
router.post('/validate-platform-user', validatePlatformUserHandler);

export default router;