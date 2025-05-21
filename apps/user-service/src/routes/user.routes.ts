/**
 * User Routes
 *
 * Routes for user-related operations.
 */
import { Router } from 'express';
import { 
  validateProviderUserIdHandler
} from '../controllers/user.controller';

const router = Router();

// User routes
router.post('/validate-provider-user-id', validateProviderUserIdHandler);

export default router;