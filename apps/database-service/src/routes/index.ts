/**
 * Main routes index
 * Combines all route modules
 */
import { Router } from 'express';
import healthRoutes from './health.js';
import usersRoutes from './users.js';
import apiKeysRoutes from './api-keys.js';
import apiLogsRoutes from './api-logs.js';
import credentialsRoutes from './credentials.js';
import agentsRoutes from './agents.js';
import conversationsRoutes from './conversations.js';
import webhooksRoutes from './webhooks.js';

const router = Router();

// Mount route modules
router.use(healthRoutes);
router.use(usersRoutes);
router.use(apiKeysRoutes);
router.use('/api-logs', apiLogsRoutes);
router.use('/credentials', credentialsRoutes);
router.use('/agents', agentsRoutes);
router.use('/conversations', conversationsRoutes);
router.use('/webhooks', webhooksRoutes);

export default router; 