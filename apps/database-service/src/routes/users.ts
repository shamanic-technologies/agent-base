/**
 * User routes
 */
import { Router, Request, Response } from 'express';
import { pgPool } from '../db.js';
import { handleDatabaseError } from '../utils/error-handler.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * Ensures the users table exists
 * Creates it if it doesn't exist yet
 */
async function ensureUsersTableExists(): Promise<void> {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS "users" (
        id UUID PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    await pgPool.query(createTableQuery);
    console.log('Users table exists or was created successfully');
  } catch (error) {
    console.error('Error ensuring users table exists:', error);
    throw error;
  }
}

/**
 * Get current user data from the users collection
 * Uses x-user-id header provided by API Gateway Service
 */
router.get('/db/users/me', async (req: Request, res: Response): Promise<void> => {
  try {
    // Ensure users table exists
    await ensureUsersTableExists();
    
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
    
    // Execute query using pgPool directly
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

/**
 * Get or create a user by provider ID
 * If user with providerId exists, updates and returns it
 * Otherwise creates a new user record
 */
router.post('/db/users/get-or-create-user', async (req: Request, res: Response): Promise<void> => {
  try {
    // Ensure users table exists
    await ensureUsersTableExists();
    
    const userData = req.body;
    
    if (!userData || !userData.data || !userData.data.providerId) {
      res.status(400).json({
        success: false,
        error: 'Missing required field: data.providerId'
      });
      return;
    }
    
    console.log(`Get or create user with providerId: ${userData.data.providerId}`);
    
    // First check if user exists
    const findQuery = `
      SELECT * FROM "users" 
      WHERE data->>'providerId' = $1 
      LIMIT 1
    `;
    
    const findResult = await pgPool.query(findQuery, [userData.data.providerId]);
    
    if (findResult.rowCount > 0) {
      // User exists, update it
      const existingUser = findResult.rows[0];
      
      const updateQuery = `
        UPDATE "users"
        SET data = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;
      
      // Merge existing data with new data
      const updatedData = {
        ...existingUser.data,
        ...userData.data,
        last_login: new Date().toISOString()
      };
      
      const updateResult = await pgPool.query(updateQuery, [updatedData, existingUser.id]);
      
      res.status(200).json({
        success: true,
        data: updateResult.rows[0],
        updated: true
      });
    } else {
      // User doesn't exist, create it
      const createQuery = `
        INSERT INTO "users" (id, data, created_at, updated_at)
        VALUES ($1, $2, NOW(), NOW())
        RETURNING *
      `;
      
      // Use provided ID or generate a new UUID
      const userId = userData.id || uuidv4();
      
      // Ensure created_at and last_login exist
      const newUserData = {
        ...userData.data,
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString()
      };
      
      const createResult = await pgPool.query(createQuery, [userId, newUserData]);
      
      res.status(201).json({
        success: true,
        data: createResult.rows[0],
        created: true
      });
    }
  } catch (error) {
    console.error('Error in get-or-create-user:', error);
    handleDatabaseError(error, res, 'users');
  }
});

export default router; 