/**
 * Main routes index
 * Combines all route modules
 */
import { Router } from 'express';
import healthRoutes from './health.js';
import platformUsersRoutes from './platform-users.js';
import apiKeysRoutes from './api-keys.js';
// import apiLogsRoutes from './api-logs.js';
import oauthRoutes from './oauth.js';
import agentsRoutes from './agents.js';
// import conversationsRoutes from './conversations.js';
import conversationsLangGraphRoutes from './conversations-langgraph.js';
// import webhooksRoutes from './webhooks.js';
import clientUsersRoutes from './client-users.js';
import clientOrganizationsRoutes from './client-organizations.js';
// import actionsRoutes from './actions.js';
import actionsLangGraphRoutes from './actions-langgraph.js';

const router = Router();

// Mount route modules
router.use('/health', healthRoutes);
router.use('/platform-users', platformUsersRoutes);
router.use('/api-keys', apiKeysRoutes);
// router.use('/api-logs', apiLogsRoutes);
router.use('/oauth', oauthRoutes);
router.use('/agents', agentsRoutes);
// router.use('/conversations', conversationsRoutes);
router.use('/conversations-langgraph', conversationsLangGraphRoutes);
// router.use('/webhooks', webhooksRoutes);
router.use('/client-users', clientUsersRoutes);

// Mount actionsRoutes under /actions
// ClientUserId will be read from headers within actionsRoutes
router.use('/actions', actionsLangGraphRoutes);

router.use('/client-organizations', clientOrganizationsRoutes);

export default router; 