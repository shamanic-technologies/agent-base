/**
 * API Routes Module
 * 
 * Contains all Express route handlers for the database service
 */
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pgPool, listTables, cleanupTables } from './db';

const router = Router();

/**
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response): void => {
  res.status(200).json({ 
    status: 'healthy',
    provider: 'railway-postgres'
  });
});

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

/**
 * List all collections (tables)
 */
router.get('/db', async (req: Request, res: Response): Promise<void> => {
  try {
    const tableNames = await listTables();
    
    res.status(200).json({
      success: true,
      data: tableNames.map(name => ({ name }))
    });
  } catch (error) {
    console.error('Error listing collections:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to list collections'
    });
  }
});

/**
 * Get API keys for a specific user
 * Specialized endpoint for API keys with user filtering
 */
router.get('/api-keys', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'userId query parameter is required'
      });
      return;
    }
    
    console.log(`Fetching API keys for user ID: ${userId}`);
    
    // Ensure api_keys collection exists
    await createCollection('api_keys');
    
    // Query keys by userId
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
 */
router.post('/api-keys', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, name, keyPrefix, keyHash, id, createdAt, active } = req.body;
    
    if (!userId || !name || !keyPrefix || !keyHash) {
      res.status(400).json({
        success: false,
        error: 'userId, name, keyPrefix, and keyHash are required'
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

/**
 * Create a new item in a collection
 */
router.post('/db/:collection', async (req: Request, res: Response): Promise<void> => {
  try {
    const { collection } = req.params;
    const data = req.body;
    
    if (!collection) {
      res.status(404).json({
        success: false,
        error: 'Collection not found'
      });
      return;
    }
    
    if (!data) {
      res.status(400).json({
        success: false,
        error: 'Data is required'
      });
      return;
    }
    
    // Generate ID if not provided
    const item = {
      id: data.id || uuidv4(),
      ...data,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Build query with dynamic column names
    const columns = Object.keys(item);
    const values = Object.values(item);
    const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
    
    const query = `
      INSERT INTO "${collection}" (${columns.map(c => `"${c}"`).join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;
    
    const result = await pgPool.query(query, values);
    
    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    handleDatabaseError(error, res, req.params.collection);
  }
});

/**
 * Get items from a collection
 */
router.get('/db/:collection', async (req: Request, res: Response): Promise<void> => {
  try {
    const { collection } = req.params;
    const { query, limit, offset } = req.query;
    
    if (!collection) {
      res.status(404).json({
        success: false,
        error: 'Collection not found'
      });
      return;
    }
    
    // Start building the query
    let sqlQuery = `SELECT * FROM "${collection}"`;
    const queryParams: any[] = [];
    
    // Apply query filters if present
    if (query) {
      try {
        const filters = JSON.parse(query as string);
        
        // Apply each filter, handling JSONB path queries for the data field
        const whereConditions = Object.entries(filters).map(([key, value], index) => {
          queryParams.push(value);
          
          // Check if this is a nested path query for data field (e.g., "data.fieldName")
          if (key.startsWith('data.')) {
            // Extract the path after 'data.'
            const jsonPath = key.substring(5); // Remove 'data.'
            // Use PostgreSQL JSONB path operator ->
            return `data->>'${jsonPath}' = $${index + 1}`;
          }
          
          // Regular field comparison for non-nested fields
          return `"${key}" = $${index + 1}`;
        });
        
        if (whereConditions.length > 0) {
          sqlQuery += ` WHERE ${whereConditions.join(' AND ')}`;
        }
      } catch (e) {
        res.status(400).json({
          success: false,
          error: 'Invalid query format'
        });
        return;
      }
    }
    
    // Apply pagination
    const limitNum = limit ? parseInt(limit as string) : 100;
    const offsetNum = offset ? parseInt(offset as string) : 0;
    
    // Count total matching records
    const countQuery = sqlQuery.replace('SELECT *', 'SELECT COUNT(*)');
    const countResult = await pgPool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);
    
    // Apply pagination to the original query
    sqlQuery += ` LIMIT ${limitNum} OFFSET ${offsetNum}`;
    
    // Execute the query
    const result = await pgPool.query(sqlQuery, queryParams);
    
    res.status(200).json({
      success: true,
      data: {
        items: result.rows || [],
        total: total || 0,
        limit: limitNum,
        offset: offsetNum
      }
    });
  } catch (error: any) {
    handleDatabaseError(error, res, req.params.collection);
  }
});

/**
 * Get a single item from a collection
 */
router.get('/db/:collection/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { collection, id } = req.params;
    
    if (!collection) {
      res.status(404).json({
        success: false,
        error: 'Collection not found'
      });
      return;
    }
    
    const query = `SELECT * FROM "${collection}" WHERE id = $1`;
    const result = await pgPool.query(query, [id]);
    
    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Item not found'
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    handleDatabaseError(error, res, req.params.collection);
  }
});

/**
 * Update an item in a collection
 */
router.put('/db/:collection/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { collection, id } = req.params;
    const updates = req.body;
    
    if (!collection) {
      res.status(404).json({
        success: false,
        error: 'Collection not found'
      });
      return;
    }
    
    // Update the item
    const updatedItem = {
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    // Build query with dynamic column names
    const columns = Object.keys(updatedItem);
    const values = Object.values(updatedItem);
    const setClause = columns.map((col, idx) => `"${col}" = $${idx + 1}`).join(', ');
    
    // Add id as the last parameter
    values.push(id);
    
    const query = `
      UPDATE "${collection}"
      SET ${setClause}
      WHERE id = $${values.length}
      RETURNING *
    `;
    
    const result = await pgPool.query(query, values);
    
    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Item not found'
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    handleDatabaseError(error, res, req.params.collection);
  }
});

/**
 * Delete an item from a collection
 */
router.delete('/db/:collection/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { collection, id } = req.params;
    
    if (!collection) {
      res.status(404).json({
        success: false,
        error: 'Collection not found'
      });
      return;
    }
    
    // Get the item first to return it after deletion
    const getQuery = `SELECT * FROM "${collection}" WHERE id = $1`;
    const getResult = await pgPool.query(getQuery, [id]);
    
    if (getResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Item not found'
      });
      return;
    }
    
    const item = getResult.rows[0];
    
    // Delete the item
    const deleteQuery = `DELETE FROM "${collection}" WHERE id = $1`;
    await pgPool.query(deleteQuery, [id]);
    
    res.status(200).json({
      success: true,
      data: {
        message: 'Item deleted successfully',
        item
      }
    });
  } catch (error: any) {
    handleDatabaseError(error, res, req.params.collection);
  }
});

/**
 * Disabled endpoint for creating tables
 */
router.post('/db', (req: Request, res: Response): void => {
  res.status(400).json({
    success: false,
    error: 'Creating tables through the API is not supported. Please use migrations instead.'
  });
});

/**
 * Remove all tables except whitelisted ones
 */
router.delete('/db/cleanup', async (req: Request, res: Response): Promise<void> => {
  try {
    const { whitelist = [] } = req.body;
    
    console.log(`Starting table cleanup via API with whitelist: [${whitelist.join(', ')}]`);
    const droppedTables = await cleanupTables(whitelist);
    
    res.status(200).json({
      success: true,
      data: {
        message: `Successfully dropped ${droppedTables.length} tables`,
        droppedTables
      }
    });
  } catch (error: any) {
    console.error('Error during table cleanup:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to cleanup tables'
    });
  }
});

/**
 * Handle database errors and send appropriate response
 */
function handleDatabaseError(error: any, res: Response, collection?: string): void {
  console.error('Database error:', error);
  
  // Check if the error is about a relation not existing (table not found)
  if (error.code === '42P01' && collection) {
    // Try to create the table
    createCollection(collection)
      .then(() => {
        res.status(404).json({
          success: false,
          error: `Collection "${collection}" not found but has been created. Please try again.`
        });
      })
      .catch(createErr => {
        console.error('Error creating collection:', createErr);
        res.status(500).json({
          success: false,
          error: `Failed to create collection: ${createErr.message}`
        });
      });
    return;
  }
  
  res.status(500).json({
    success: false,
    error: error.message || 'Database operation failed'
  });
}

/**
 * Create a new collection (table) if it doesn't exist
 */
async function createCollection(collection: string): Promise<void> {
  const client = await pgPool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "${collection}" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        data JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log(`Created collection: ${collection}`);
  } finally {
    client.release();
  }
}

export default router; 