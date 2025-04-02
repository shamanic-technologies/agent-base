/**
 * API Key routes
 */
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pgPool } from '../db.js';
import { handleDatabaseError } from '../utils/error-handler.js';
import { createCollection } from '../db.js';

const router = Router();

/**
 * Get API keys for a specific user
 * Specialized endpoint for API keys with user filtering
 * Gets user ID from x-user-id header
 */
router.get('/api-keys', async (req: Request, res: Response): Promise<void> => {
  try {
    // Get userId from x-user-id header only - no fallbacks
    const userId = req.headers['x-user-id'] as string;
    
    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
      return;
    }
    
    console.log(`Fetching API keys for user ID: ${userId}`);
    
    // Ensure api_keys collection exists
    await createCollection('api_keys');
    
    // Query keys by userId from header, not from query params
    const query = `
      SELECT * FROM "api_keys"
      WHERE data->>'userId' = $1
      ORDER BY data->>'createdAt' DESC
    `;
    
    const result = await pgPool.query(query, [userId]);
    
    res.status(200).json({
      success: true,
      data: {
        items: result.rows,
        total: result.rowCount,
        limit: 100,
        offset: 0
      }
    });
  } catch (error: any) {
    handleDatabaseError(error, res, 'api_keys');
  }
});

/**
 * Create a new API key
 * Specialized endpoint for storing API keys
 * Gets user ID from x-user-id header
 */
router.post('/api-keys', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, keyPrefix, keyHash, id, createdAt, active } = req.body;
    
    // Get userId from x-user-id header only - no fallbacks
    const userId = req.headers['x-user-id'] as string;
    
    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
      return;
    }
    
    if (!name || !keyPrefix || !keyHash) {
      const missing = [];
      if (!name) missing.push('name');
      if (!keyPrefix) missing.push('keyPrefix');
      if (!keyHash) missing.push('keyHash');
      
      res.status(400).json({
        success: false,
        error: `Required fields missing: ${missing.join(', ')}`
      });
      return;
    }
    
    console.log(`Creating new API key for user ID: ${userId}`);
    
    // Ensure api_keys collection exists
    await createCollection('api_keys');
    
    // Prepare key data
    const keyData = {
      userId,
      name,
      keyPrefix,
      keyHash,
      id: id || uuidv4(),
      createdAt: createdAt || new Date().toISOString(),
      lastUsed: null,
      active: active !== undefined ? active : true
    };
    
    // Insert the new key
    const item = {
      id: uuidv4(),
      data: keyData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Build query with dynamic column names
    const columns = Object.keys(item);
    const values = Object.values(item);
    const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
    
    const query = `
      INSERT INTO "api_keys" (${columns.map(c => `"${c}"`).join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;
    
    const result = await pgPool.query(query, values);
    
    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    handleDatabaseError(error, res, 'api_keys');
  }
});

export default router; 