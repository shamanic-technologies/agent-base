/**
 * HelloWorld Database Service
 * 
 * A Supabase-based database service for storing and retrieving data.
 * Acts as a data persistence layer for the other services.
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3006;

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  console.error('Current env vars:', {
    SUPABASE_URL: process.env.SUPABASE_URL,
    PORT: process.env.PORT
  });
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req: express.Request, res: express.Response) => {
  res.status(200).json({ 
    status: 'healthy',
    provider: 'supabase'
  });
});

/**
 * Create a new item in a collection
 * 
 * Request params:
 * - collection: Name of the collection
 * 
 * Request body:
 * - item data
 */
app.post('/db/:collection', async (req: express.Request, res: express.Response) => {
  try {
    const { collection } = req.params;
    const data = req.body;
    
    if (!collection) {
      return res.status(404).json({
        success: false,
        error: 'Collection not found'
      });
    }
    
    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Data is required'
      });
    }
    
    // Generate ID if not provided
    const item = {
      id: data.id || uuidv4(),
      ...data,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Add to collection in Supabase
    const { data: insertedData, error } = await supabase
      .from(collection)
      .insert(item)
      .select();
    
    if (error) {
      console.error(`Error creating item in ${collection}:`, error);
      
      return res.status(error.code === '42P01' ? 404 : 500).json({
        success: false,
        error: error.message
      });
    }
    
    return res.status(201).json({
      success: true,
      data: insertedData[0]
    });
  } catch (error) {
    console.error(`Error creating item:`, error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to create item'
    });
  }
});

/**
 * Get items from a collection
 * 
 * Request params:
 * - collection: Name of the collection
 * 
 * Query params:
 * - query: JSON string containing filter criteria
 * - limit: Maximum number of items to return
 * - offset: Offset for pagination
 */
app.get('/db/:collection', async (req: express.Request, res: express.Response) => {
  try {
    const { collection } = req.params;
    const { query, limit, offset } = req.query;
    
    if (!collection) {
      return res.status(404).json({
        success: false,
        error: 'Collection not found'
      });
    }
    
    // Start query
    let queryBuilder = supabase.from(collection).select('*');
    
    // Apply query filters if present
    if (query) {
      try {
        const filters = JSON.parse(query as string);
        
        // Apply each filter as an equality condition
        Object.entries(filters).forEach(([key, value]) => {
          queryBuilder = queryBuilder.eq(key, value);
        });
      } catch (e) {
        return res.status(400).json({
          success: false,
          error: 'Invalid query format'
        });
      }
    }
    
    // Apply pagination
    const limitNum = limit ? parseInt(limit as string) : 100;
    const offsetNum = offset ? parseInt(offset as string) : 0;
    
    queryBuilder = queryBuilder
      .limit(limitNum)
      .range(offsetNum, offsetNum + limitNum - 1);
    
    // Execute query
    const { data, error, count } = await queryBuilder.select('*', { count: 'exact' });
    
    if (error) {
      console.error(`Error retrieving items from ${collection}:`, error);
      
      return res.status(error.code === '42P01' ? 404 : 500).json({
        success: false,
        error: error.message
      });
    }
    
    return res.status(200).json({
      success: true,
      data: {
        items: data || [],
        total: count || 0,
        limit: limitNum,
        offset: offsetNum
      }
    });
  } catch (error) {
    console.error(`Error retrieving items:`, error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve items'
    });
  }
});

/**
 * Get a single item from a collection
 * 
 * Request params:
 * - collection: Name of the collection
 * - id: ID of the item
 */
app.get('/db/:collection/:id', async (req: express.Request, res: express.Response) => {
  try {
    const { collection, id } = req.params;
    
    if (!collection) {
      return res.status(404).json({
        success: false,
        error: 'Collection not found'
      });
    }
    
    const { data, error } = await supabase
      .from(collection)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Error retrieving item from ${collection}:`, error);
      
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Item not found'
        });
      }
      
      return res.status(error.code === '42P01' ? 404 : 500).json({
        success: false,
        error: error.message
      });
    }
    
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error(`Error retrieving item:`, error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve item'
    });
  }
});

/**
 * Update an item in a collection
 * 
 * Request params:
 * - collection: Name of the collection
 * - id: ID of the item
 * 
 * Request body:
 * - Updated item data
 */
app.put('/db/:collection/:id', async (req: express.Request, res: express.Response) => {
  try {
    const { collection, id } = req.params;
    const updates = req.body;
    
    if (!collection) {
      return res.status(404).json({
        success: false,
        error: 'Collection not found'
      });
    }
    
    // Update the item
    const updatedItem = {
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from(collection)
      .update(updatedItem)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error(`Error updating item in ${collection}:`, error);
      
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Item not found'
        });
      }
      
      return res.status(error.code === '42P01' ? 404 : 500).json({
        success: false,
        error: error.message
      });
    }
    
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error(`Error updating item:`, error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to update item'
    });
  }
});

/**
 * Delete an item from a collection
 * 
 * Request params:
 * - collection: Name of the collection
 * - id: ID of the item
 */
app.delete('/db/:collection/:id', async (req: express.Request, res: express.Response) => {
  try {
    const { collection, id } = req.params;
    
    if (!collection) {
      return res.status(404).json({
        success: false,
        error: 'Collection not found'
      });
    }
    
    // Get the item first to return it after deletion
    const { data: item, error: getError } = await supabase
      .from(collection)
      .select('*')
      .eq('id', id)
      .single();
    
    if (getError) {
      if (getError.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Item not found'
        });
      }
      
      return res.status(getError.code === '42P01' ? 404 : 500).json({
        success: false,
        error: getError.message
      });
    }
    
    // Delete the item
    const { error: deleteError } = await supabase
      .from(collection)
      .delete()
      .eq('id', id);
    
    if (deleteError) {
      console.error(`Error deleting item from ${collection}:`, deleteError);
      
      return res.status(deleteError.code === '42P01' ? 404 : 500).json({
        success: false,
        error: deleteError.message
      });
    }
    
    return res.status(200).json({
      success: true,
      data: {
        message: 'Item deleted successfully',
        item
      }
    });
  } catch (error) {
    console.error(`Error deleting item:`, error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to delete item'
    });
  }
});

/**
 * List all collections (tables) in the database
 */
app.get('/db', async (req: express.Request, res: express.Response) => {
  try {
    // Get all tables from the Postgres schema information
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (error) {
      console.error('Error listing tables:', error);
      
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
    
    const collections = data.map(item => ({
      name: item.table_name
    }));
    
    return res.status(200).json({
      success: true,
      data: collections
    });
  } catch (error) {
    console.error('Error listing collections:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to list collections'
    });
  }
});

/**
 * Create a new collection endpoint has been removed
 * as Supabase tables should be created through migrations
 * rather than at runtime
 */
app.post('/db', (req: express.Request, res: express.Response) => {
  return res.status(400).json({
    success: false,
    error: 'Creating tables through the API is not supported. Please use migrations instead.'
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`💾 Database Service running on port ${PORT} with Supabase storage`);
}); 