/**
 * Main routes index file
 * Exports all route modules for the application in a flattened structure
 */
import { Router } from 'express';
// import createKeyRoutes from './create.js';
import listKeysRoutes from './list.js';
import validateKeyRoutes from './validate.js';
import getKeyRoutes from './get.js';

const router = Router();

// Mount all key routes with /keys prefix
// router.use('/keys', createKeyRoutes);  // POST /keys
router.use('/keys', listKeysRoutes);   // GET /keys
router.use('/keys', validateKeyRoutes); // POST /keys/validate
router.use('/keys', getKeyRoutes);     // GET /keys/:keyId

export default router; 