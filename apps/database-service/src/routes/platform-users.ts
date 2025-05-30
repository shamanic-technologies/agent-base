/**
 * User routes
 */
import { Router, Request, Response } from 'express';
import { getPlatformUserById, getOrCreatePlatformUserByProviderUserId } from '../services/platform-users.js';
import { GetOrCreatePlatformUserInput } from '@agent-base/types';

const router = Router();

/**
 * Get current user data from the platform users collection
 * Uses x-platform-user-id header provided by API Gateway Service
 */
router.get('/me', async (req: Request, res: Response): Promise<void> => {
  try {
    // Get the user ID from the x-user-id header
    const platformUserId = req.headers['x-platform-user-id'] as string;
    
    if (!platformUserId) {
      console.error('No x-platform-user-id header found in request to /users/me');
      res.status(400).json({
        success: false,
        error: 'Missing required header: x-platform-user-id'
      });
      return;
    }
        
    // Call the service function to get user by user ID
    const getResponse = await getPlatformUserById(platformUserId);
    
    if (!getResponse.success) {
      console.error('Error fetching user data:', getResponse.error);
      res.status(400).json(getResponse);
      return;
    }
    
    // Return the user data
    res.status(200).json(getResponse);
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * Get or create a user by auth user ID
 * If user with auth_user_id exists, updates and returns it
 * Otherwise creates a new user record
 */
router.post('/get-or-create-by-auth-user-id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userData = req.body as GetOrCreatePlatformUserInput;
    
    if (!userData || !userData.authUserId) {
      console.error('Missing required field: authUserId');
      res.status(400).json({
        success: false,
        error: 'Missing required field: authUserId'
      });
      return;
    }
    
    console.log(`Get or create user with auth_user_id: ${userData.authUserId}`);
    
    // Call the service function to get or create user
    const getOrCreateResponse = await getOrCreatePlatformUserByProviderUserId(userData);
    
    if (!getOrCreateResponse.success) {
      console.error('Error in get-or-create user:', getOrCreateResponse.error);
      res.status(400).json(getOrCreateResponse);
      return;
    }
    
    // Return the appropriate status based on whether the user was created or updated
    res.status(201).json(getOrCreateResponse);
  } catch (error) {
    console.error('Error in get-or-create user:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router; 