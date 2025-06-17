/**
 * Client Users Routes
 * 
 * Defines API endpoints related to client users.
 */
import express, { Request, Response, Router } from 'express';
import {
  upsertClientUser,
  getOrganizationsForClientUser
} from '../services/client-users.js';
import {
  UpsertClientUserInput, // Input type for validation
  ClientUser,              // Expected user data type
  ServiceResponse          // Standard service response wrapper
} from '@agent-base/types';

// Create a new Express router
const router: Router = express.Router();

/**
 * POST /client-users
 * 
 * Endpoint to create or retrieve a client user based on platform details.
 * Expects platformUserId, clientAuthUserId, and clientAuthOrganizationId in the request body.
 * Returns the client user data upon success.
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {

  const platformUserId = req.headers['x-platform-user-id'] as string;
  const clientAuthUserId = req.headers['x-client-auth-user-id'] as string;
  const clientAuthOrganizationId = req.headers['x-client-auth-organization-id'] as string | undefined;

  if (!platformUserId) {
    console.error('[POST /client-users] Missing required fields in body: platformUserId');
    res.status(400).json({ 
      error: 'Missing required fields in body: platformUserId' 
    });
    return;
  }
  if (!clientAuthUserId) {
    console.error('[POST /client-users] Missing required fields in body: clientAuthUserId');
    res.status(400).json({ 
      error: 'Missing required fields in body: clientAuthUserId' 
    });
    return;
  }

  // Prepare input for the service function
  const input: UpsertClientUserInput = { platformUserId, authUserId: clientAuthUserId };

  try {
    // Call the service function to perform the upsert operation
    const upsertResponse: ServiceResponse<ClientUser> = await upsertClientUser(input);

    // Handle the service response
    if (!upsertResponse.success) {
      // Failure: Log the specific error from the service for debugging
      console.error(`[POST /client-users] Service error: ${upsertResponse.error}`);
      // Return a generic 500 error to the client for security
      res.status(500).json(upsertResponse);
      return;
    }
    // Success: return 200 OK with the user data
    res.status(200).json(upsertResponse);
  } catch (error: any) {
    // Catch unexpected errors during the process (e.g., network issues, uncaught exceptions in service)
    console.error('[POST /client-users] Unexpected error:', error);
    res.status(500).json({ error: 'An unexpected server error occurred' });
    return;
  }
});

/**
 * GET /client-users/:clientUserId/organizations
 *
 * Endpoint to retrieve all organizations for a given client user.
 */
router.get('/:clientUserId/organizations', async (req: Request, res: Response): Promise<void> => {
  const { clientUserId } = req.params;

  if (!clientUserId) {
    console.error('[GET /client-users/:clientUserId/organizations] Missing required fields in body: clientUserId');
    res.status(400).json({ error: 'clientUserId parameter is required' });
    return;
  }

  try {
    const response = await getOrganizationsForClientUser(clientUserId);

    if (!response.success) {
      console.error(`[GET /client-users/:clientUserId/organizations] Service error: ${response.error}`);
      res.status(500).json(response);
      return;
    }

    res.status(200).json(response);
  } catch (error: any) {
    console.error(`[GET /client-users/:clientUserId/organizations] Unexpected error:`, error);
    res.status(500).json({ error: 'An unexpected server error occurred' });
  }
});

// Export the router for use in the main application
export default router; 