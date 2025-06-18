/**
 * Client Organizations Routes
 * 
 * Defines API endpoints related to client organizations.
 */
import express, { Request, Response, Router } from 'express';
import {
  UpsertClientOrganizationInput, // Input type for validation
  ClientOrganization,              // Expected user data type
  ServiceResponse          // Standard service response wrapper
} from '@agent-base/types';
import { 
  upsertClientOrganization,
  updateClientOrganization,
  deleteClientOrganization,
  getClientOrganizationByAuthId,
} from '../services/client-organizations.js';

// Create a new Express router
const router: Router = express.Router();

/**
 * POST /client-organizations
 * 
 * Endpoint to create or retrieve a client organization based on platform details.
 * Expects platformUserId, clientAuthOrganizationId in the request body.
 * Returns the client organization data upon success.
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {

  // const clientAuthUserId = req.headers['x-client-auth-user-id'] as string | undefined; // Not directly used for org upsert
  const clientAuthOrganizationId = req.headers['x-client-auth-organization-id'] as string; // This is the unique ID for the org
  const clientUserId = req.headers['x-client-user-id'] as string; // This is the unique ID for the user

  const { name, profileImage } = req.body; // Get name and profileImage from body

  if (!clientAuthOrganizationId) {
    console.error(`[POST /client-organizations] Missing required header: x-client-auth-organization-id`);
    res.status(400).json({ error: 'Missing required header: x-client-auth-organization-id' });
    return;
  }
  if (!clientUserId) {
    console.error(`[POST /client-organizations] Missing required header: x-client-user-id`);
    res.status(400).json({ error: 'Missing required header: x-client-user-id' });
    return;
  }

  // Prepare input for the service function
  // The service now expects platformUserId, authOrganizationId (for client_auth_organization_id), name, and optionally profileImage
  const input: UpsertClientOrganizationInput = { 
    creatorClientUserId: clientUserId,
    clientAuthOrganizationId, 
    name,
    profileImage 
  };

  try {
    const upsertResponse: ServiceResponse<ClientOrganization> = await upsertClientOrganization(input);

    if (!upsertResponse.success) {
      console.error(`[POST /client-organizations] Service error: ${upsertResponse.error}`);
      // Determine appropriate status code based on error type if possible
      const statusCode = upsertResponse.error.includes('Missing required fields') ? 400 : 500;
      res.status(statusCode).json(upsertResponse);
      return;
    }
    // Success: return 200 OK (or 201 if a new resource was created, though upsert makes this ambiguous without more info)
    res.status(200).json(upsertResponse);
  } catch (error: any) {
    console.error('[POST /client-organizations] Unexpected error:', error);
    res.status(500).json({ success: false, error: 'An unexpected server error occurred' });
  }
});

router.put('/:organizationId', async (req: Request, res: Response): Promise<void> => {
  const { organizationId } = req.params;
  const clientUserId = req.headers['x-client-user-id'] as string;
  const updates = req.body;

  if (!clientUserId) {
    console.error(`[PUT /client-organizations/:organizationId] Missing required header: x-client-user-id`);
    res.status(400).json({ error: 'Missing required header: x-client-user-id' });
    return;
  }

  try {
    const response = await updateClientOrganization(organizationId, clientUserId, updates);
    res.status(response.success ? 200 : 404).json(response);
  } catch (error) {
    res.status(500).json({ success: false, error: 'An unexpected server error occurred' });
  }
});

router.delete('/:organizationId', async (req: Request, res: Response): Promise<void> => {
  const { organizationId } = req.params;
  const clientUserId = req.headers['x-client-user-id'] as string;

  if (!clientUserId) {
    console.error(`[DELETE /client-organizations/:organizationId] Missing required header: x-client-user-id`);
    res.status(400).json({ error: 'Missing required header: x-client-user-id' });
    return;
  }

  try {
    const response = await deleteClientOrganization(organizationId, clientUserId);
    res.status(response.success ? 200 : 404).json(response);
  } catch (error) {
    res.status(500).json({ success: false, error: 'An unexpected server error occurred' });
  }
});

router.get('/auth/:clientAuthOrganizationId', async (req: Request, res: Response): Promise<void> => {
  const { clientAuthOrganizationId } = req.params;

  try {
    const response = await getClientOrganizationByAuthId(clientAuthOrganizationId);
    res.status(response.success ? 200 : 404).json(response);
  } catch (error) {
    console.error(`[GET /client-organizations/auth/:clientAuthOrganizationId] Unexpected error:`, error);
    res.status(500).json({ success: false, error: 'An unexpected server error occurred' });
  }
});

// Export the router for use in the main application
export default router; 