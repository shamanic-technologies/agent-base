/**
 * Route Index
 * 
 * Exports all routes for the application
 */
import { Router } from 'express';
import authRoutes from './auth.routes';
import oauthRoutes from './oauth.routes';
import miscRoutes from './misc.routes';

const router = Router();

// Mount the routes
router.use('/', miscRoutes);
router.use('/auth', authRoutes);
router.use('/auth', oauthRoutes);

export default router; 