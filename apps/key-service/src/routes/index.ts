/**
 * Main routes index file
 * Exports all route modules for the application in a flattened structure
 */
import { Router } from 'express';
// import createKeyRoutes from './create.js';
import listKeysRoutes from './list.js';
import validateKeyRoutes from './validate.js';
import getKeyRoutes from './get.js';
import deleteRouter from './delete.js';

const router = Router();

// Mount all key routes directly at the root
// Note: Ensure paths within the route files are adjusted accordingly (e.g., '/' in list.ts)
// router.use('/', createKeyRoutes);  // POST /
router.use('/', listKeysRoutes);   // GET /
router.use('/validate', validateKeyRoutes); // POST /validate
router.use('/', getKeyRoutes);     // GET /:keyId, GET /by-name
router.use('/', deleteRouter);

export default router; 