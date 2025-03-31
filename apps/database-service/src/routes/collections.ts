/**
 * Collection routes
 */
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pgPool, listTables, cleanupTables } from '../db';
import { handleDatabaseError } from '../utils/error-handler';

const router = Router();

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
 * Get documents from a collection
 * Applies filtering, pagination, and sorting options
 */
router.get('/db/:collection', async (req: Request, res: Response): Promise<void> => {
  try {
    const { collection } = req.params;
    const { query, limit, offset, sort } = req.query;
    
    // Check if collection exists by attempting to query it
    try {
      await pgPool.query(`SELECT 1 FROM "${collection}" LIMIT 1`);
    } catch (err: any) {
      if (err.code === '42P01') { // Table doesn't exist
        res.status(404).json({
          success: false,
          error: `Collection '${collection}' not found`
        });
        return;
      }
      throw err; // Re-throw other errors
    }
    
    // Build query
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

export default router; 