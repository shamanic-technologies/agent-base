/**
 * Client Organization Routes
 *
 * Routes for client organization operations.
 */
import { Router } from 'express';
import {
  updateClientOrganizationHandler,
  deleteClientOrganizationHandler,
  getClientOrganizationByAuthIdHandler,
} from '../controllers/client-organization.controller';

const router = Router();

router.put('/:organizationId', updateClientOrganizationHandler as any);
router.delete('/:organizationId', deleteClientOrganizationHandler as any);
router.get('/auth/:clientAuthOrganizationId', getClientOrganizationByAuthIdHandler as any);

export default router; 