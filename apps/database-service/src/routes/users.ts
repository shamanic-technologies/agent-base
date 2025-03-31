/**
 * User routes
 */
import { Router, Request, Response } from 'express';
import { pgPool } from '../db';
import { handleDatabaseError } from '../utils/error-handler';

const router = Router();

/**
 * Get current user data from the users collection
 * Uses x-user-id header provided by API Gateway Service
 */
router.get('/db/users/me', async (req: Request, res: Response): Promise<void> => {
  try {
    // Get the user ID from the x-user-id header
    const userId = req.headers['x-user-id'] as string;
    
    if (!userId) {
      console.error('No x-user-id header found in request to /db/users/me');
      res.status(400).json({
        success: false,
        error: 'Missing required header: x-user-id'
      });
      return;
    }
    
    console.log(`Fetching user data for user ID: ${userId}`);
    
    // Query the users table for the record with matching providerId
    const query = `
      SELECT * FROM "users" 
      WHERE data->>'providerId' = $1 
      LIMIT 1
    `;
    
    const result = await pgPool.query(query, [userId]);
    
    if (result.rowCount === 0) {
      console.log(`No user found with providerId: ${userId}`);
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }
    
    // Return the user data
    const userData = result.rows[0];
    
    res.status(200).json({
      success: true,
      data: userData
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    handleDatabaseError(error, res, 'users');
  }
});

export default router; 