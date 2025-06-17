/**
 * Client Organization Routes
 *
 * Routes for client organization operations.
 */
import { Router } from 'express';
import {
  updateClientOrganizationHandler,
  deleteClientOrganizationHandler,
} from '../controllers/client-organization.controller';

const router = Router();

router.put('/:organizationId', updateClientOrganizationHandler as any);
router.delete('/:organizationId', deleteClientOrganizationHandler as any);

export default router; 