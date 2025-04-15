/**
 * Routes Index
 * 
 * Centralizes and exports all API routes
 */
import { Router } from 'express';
import authRoutes from './auth.routes';
import oauthRoutes from './oauth.routes';
import miscRoutes from './misc.routes';

const router = Router();

// Register route groups
router.use('/', miscRoutes);
router.use('/auth', authRoutes);
router.use('/oauth', oauthRoutes);

export default router; 