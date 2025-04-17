/**
 * Main routes index
 * Combines all route modules
 */
import { Router } from 'express';
import healthRoutes from './health.js';
import platformUsersRoutes from './platform-users.js';
import apiKeysRoutes from './api-keys.js';
import apiLogsRoutes from './api-logs.js';
import oauthRoutes from './oauth.js';
import agentsRoutes from './agents.js';
import conversationsRoutes from './conversations.js';
import webhooksRoutes from './webhooks.js';
import clientUsersRoutes from './client-users.js';

const router = Router();

// Mount route modules
router.use('/health', healthRoutes);
router.use('/platform-users', platformUsersRoutes);
router.use('/api-keys', apiKeysRoutes);
router.use('/api-logs', apiLogsRoutes);
router.use('/oauth', oauthRoutes);
router.use('/agents', agentsRoutes);
router.use('/conversations', conversationsRoutes);
router.use('/webhooks', webhooksRoutes);
router.use('/client-users', clientUsersRoutes);

export default router; 