/**
 * User Routes
 *
 * Routes for user-related operations.
 */
import { Router } from 'express';
import { 
  validateProviderUserHandler
} from '../controllers/provider-user.controller';

const router = Router();

// User routes
router.post('/validate', validateProviderUserHandler);

export default router;