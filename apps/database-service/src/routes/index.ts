/**
 * Main routes index
 * Combines all route modules
 */
import { Router } from 'express';
import healthRoutes from './health';
import usersRoutes from './users';
import apiKeysRoutes from './api-keys';
import collectionsRoutes from './collections';
import apiLogsRoutes from './api-logs';
import credentialsRoutes from './credentials';

const router = Router();

// Mount route modules
router.use(healthRoutes);
router.use(usersRoutes);
router.use(apiKeysRoutes);
router.use(collectionsRoutes);
router.use('/api-logs', apiLogsRoutes);
router.use('/credentials', credentialsRoutes);

export default router; 