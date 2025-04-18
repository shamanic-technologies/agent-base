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
router.use('/', authRoutes);
router.use('/', oauthRoutes);

export default router; 