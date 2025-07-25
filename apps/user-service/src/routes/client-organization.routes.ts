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
  getClientOrganizationByIdHandler,
  listClientOrganizationsHandler
} from '../controllers/client-organization.controller';

const router = Router();

router.put('/:organizationId', updateClientOrganizationHandler as any);
router.delete('/:organizationId', deleteClientOrganizationHandler as any);
router.get('/auth/:clientAuthOrganizationId', getClientOrganizationByAuthIdHandler as any);
router.get('/client/:clientOrganizationId', getClientOrganizationByIdHandler as any);
router.get('/organizations', listClientOrganizationsHandler as any);

export default router; 