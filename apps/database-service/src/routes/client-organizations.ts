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
import { upsertClientOrganization } from '../services/client-organizations.js';

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

  const platformUserId = req.headers['x-platform-user-id'] as string;
  const clientAuthUserId = req.headers['x-client-auth-user-id'] as string | undefined;
  const clientAuthOrganizationId = req.headers['x-client-auth-organization-id'] as string;

  if (!platformUserId) {
    console.error('[POST /client-organizations] Missing required fields in body: platformUserId');
    res.status(400).json({ 
      error: 'Missing required fields in body: platformUserId' 
    });
    return;
  }
  if (!clientAuthOrganizationId) {
    console.error('[POST /client-organizations] Missing required fields in body: clientAuthOrganizationId');
    res.status(400).json({ 
      error: 'Missing required fields in body: clientAuthOrganizationId' 
    });
    return;
  }

  // Prepare input for the service function
  const input: UpsertClientOrganizationInput = { platformUserId, authOrganizationId: clientAuthOrganizationId };

  try {
    // Call the service function to perform the upsert operation
    const upsertResponse: ServiceResponse<ClientOrganization> = await upsertClientOrganization(input);

    // Handle the service response
    if (!upsertResponse.success) {
      // Failure: Log the specific error from the service for debugging
      console.error(`[POST /client-organizations] Service error: ${upsertResponse.error}`);
      // Return a generic 500 error to the client for security
      res.status(500).json(upsertResponse);
      return;
    }
    // Success: return 200 OK with the organization data
    res.status(200).json(upsertResponse);
  } catch (error: any) {
    // Catch unexpected errors during the process (e.g., network issues, uncaught exceptions in service)
    console.error('[POST /client-organizations] Unexpected error:', error);
    res.status(500).json({ error: 'An unexpected server error occurred' });
    return;
  }
});

// Export the router for use in the main application
export default router; 