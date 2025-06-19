/**
 * User Routes
 *
 * Routes for user-related operations.
 */
import { Router } from 'express';
import { validatePlatformAuthUserHandler } from '../controllers/platform-user.controller';

const router = Router();

// User routes
router.post('/validate-platform-user', validatePlatformAuthUserHandler as any);

export default router;