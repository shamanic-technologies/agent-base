/**
 * Main API Router
 * 
 * Aggregates all specific route modules under the /api path.
 */
import { Router } from 'express';
import secretsRouter from './secrets.js'; // Import secrets-specific routes (add .js extension)

// Initialize the main router
const router: Router = Router();

// Mount the secrets router under the /secrets path
router.use('/secrets', secretsRouter);

// Export the main router to be used in server.ts
export default router; 