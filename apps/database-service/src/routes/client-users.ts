/**
 * Client Users Routes
 * 
 * Defines API endpoints related to client users.
 */
import express, { Request, Response, Router } from 'express';
import {
  upsertClientUser
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
 * Expects platformUserId and platformClientUserId in the request body.
 * Returns the client user data upon success.
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {

  const platformUserId = req.headers['x-platform-user-id'] as string;
  const platformClientUserId = req.headers['x-platform-client-user-id'] as string;

  if (!platformUserId || !platformClientUserId) {
    res.status(400).json({ 
      error: 'Missing required fields in body: platformUserId and platformClientUserId' 
    });
    return;
  }

  // Prepare input for the service function
  const input: UpsertClientUserInput = { platformUserId, platformClientUserId };

  try {
    // Call the service function to perform the upsert operation
    const response: ServiceResponse<ClientUser> = await upsertClientUser(input);

    // Handle the service response
    if (response.success && response.data) {
      // Success: return 200 OK with the user data
      res.status(200).json(response.data);
    } else {
      // Failure: Log the specific error from the service for debugging
      console.error(`[POST /client-users] Service error: ${response.error}`);
      // Return a generic 500 error to the client for security
      res.status(500).json({ error: response.error || 'Failed to process request' });
      return;
    }
  } catch (error: any) {
    // Catch unexpected errors during the process (e.g., network issues, uncaught exceptions in service)
    console.error('[POST /client-users] Unexpected error:', error);
    res.status(500).json({ error: 'An unexpected server error occurred' });
    return;
  }
});

// Export the router for use in the main application
export default router; 