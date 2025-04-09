/**
 * User routes
 */
import { Router, Request, Response } from 'express';
import { handleDatabaseError } from '../utils/error-handler.js';
import { getUserById, getOrCreateUserByProviderUserId } from '../services/users.js';
import { GetOrCreateUserInput } from '@agent-base/agents';

const router = Router();

/**
 * Get current user data from the users collection
 * Uses x-user-id header provided by API Gateway Service
 */
router.get('/users/me', async (req: Request, res: Response): Promise<void> => {
  try {
    // Get the user ID from the x-user-id header
    const userId = req.headers['x-user-id'] as string;
    
    if (!userId) {
      console.error('No x-user-id header found in request to /users/me');
      res.status(400).json({
        success: false,
        error: 'Missing required header: x-user-id'
      });
      return;
    }
    
    console.log(`Fetching user data for user ID: ${userId}`);
    
    // Call the service function to get user by user ID
    const result = await getUserById(userId);
    
    if (!result.success) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }
    
    // Return the user data
    res.status(200).json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    handleDatabaseError(error, res, 'users');
  }
});

/**
 * Get or create a user by provider ID
 * If user with provider_user_id exists, updates and returns it
 * Otherwise creates a new user record
 */
router.post('/users/get-or-create-by-provider-user-id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userData = req.body as GetOrCreateUserInput;
    
    if (!userData || !userData.provider_user_id) {
      res.status(400).json({
        success: false,
        error: 'Missing required field: provider_user_id'
      });
      return;
    }
    
    console.log(`Get or create user with provider_user_id: ${userData.provider_user_id}`);
    
    // Call the service function to get or create user
    const result = await getOrCreateUserByProviderUserId(userData);
    
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error || 'Failed to get or create user'
      });
      return;
    }
    
    // Return the appropriate status based on whether the user was created or updated
    if (result.created) {
      res.status(201).json({
        success: true,
        data: result.data,
        created: true
      });
    } else {
      res.status(200).json({
        success: true,
        data: result.data,
        updated: true
      });
    }
  } catch (error) {
    console.error('Error in get-or-create user:', error);
    handleDatabaseError(error, res, 'users');
  }
});

export default router; 