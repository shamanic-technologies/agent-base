/**
 * Main routes index
 * Combines all route modules
 */
import { Router } from 'express';
import healthRoutes from './health.js';
import usersRoutes from './users.js';
import apiKeysRoutes from './api-keys.js';
import collectionsRoutes from './collections.js';
import apiLogsRoutes from './api-logs.js';
import credentialsRoutes from './credentials.js';
import agentsRoutes from './agents.js';

const router = Router();

// Mount route modules
router.use(healthRoutes);
router.use(usersRoutes);
router.use(apiKeysRoutes);
router.use(collectionsRoutes);
router.use('/api-logs', apiLogsRoutes);
router.use('/credentials', credentialsRoutes);
router.use('/agents', agentsRoutes);

export default router; 