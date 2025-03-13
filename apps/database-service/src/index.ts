/**
 * HelloWorld Database Service
 * 
 * A simple in-memory database service for storing and retrieving data.
 * Acts as a data persistence layer for the other services.
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3006;

// In-memory database collections
const collections: { [key: string]: any[] } = {
  users: [],
  messages: [],
  usage: []
};

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req: express.Request, res: express.Response) => {
  res.status(200).json({ 
    status: 'healthy',
    collections: Object.keys(collections)
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
app.post('/db/:collection', (req: express.Request, res: express.Response) => {
  try {
    const { collection } = req.params;
    const data = req.body;
    
    if (!collection || !collections[collection]) {
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
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Add to collection
    collections[collection].push(item);
    
    return res.status(201).json({
      success: true,
      data: item
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
app.get('/db/:collection', (req: express.Request, res: express.Response) => {
  try {
    const { collection } = req.params;
    const { query, limit, offset } = req.query;
    
    if (!collection || !collections[collection]) {
      return res.status(404).json({
        success: false,
        error: 'Collection not found'
      });
    }
    
    let results = [...collections[collection]];
    
    // Apply query filters if present
    if (query) {
      try {
        const filters = JSON.parse(query as string);
        
        results = results.filter(item => {
          // Check if item matches all filter criteria
          return Object.entries(filters).every(([key, value]) => item[key] === value);
        });
      } catch (e) {
        return res.status(400).json({
          success: false,
          error: 'Invalid query format'
        });
      }
    }
    
    // Apply pagination
    const limitNum = limit ? parseInt(limit as string) : results.length;
    const offsetNum = offset ? parseInt(offset as string) : 0;
    
    const paginatedResults = results.slice(offsetNum, offsetNum + limitNum);
    
    return res.status(200).json({
      success: true,
      data: {
        items: paginatedResults,
        total: results.length,
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
app.get('/db/:collection/:id', (req: express.Request, res: express.Response) => {
  try {
    const { collection, id } = req.params;
    
    if (!collection || !collections[collection]) {
      return res.status(404).json({
        success: false,
        error: 'Collection not found'
      });
    }
    
    const item = collections[collection].find(item => item.id === id);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: item
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
app.put('/db/:collection/:id', (req: express.Request, res: express.Response) => {
  try {
    const { collection, id } = req.params;
    const updates = req.body;
    
    if (!collection || !collections[collection]) {
      return res.status(404).json({
        success: false,
        error: 'Collection not found'
      });
    }
    
    const index = collections[collection].findIndex(item => item.id === id);
    
    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }
    
    // Update the item
    const updatedItem = {
      ...collections[collection][index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    collections[collection][index] = updatedItem;
    
    return res.status(200).json({
      success: true,
      data: updatedItem
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
app.delete('/db/:collection/:id', (req: express.Request, res: express.Response) => {
  try {
    const { collection, id } = req.params;
    
    if (!collection || !collections[collection]) {
      return res.status(404).json({
        success: false,
        error: 'Collection not found'
      });
    }
    
    const index = collections[collection].findIndex(item => item.id === id);
    
    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }
    
    // Remove the item
    const deletedItem = collections[collection][index];
    collections[collection].splice(index, 1);
    
    return res.status(200).json({
      success: true,
      data: {
        message: 'Item deleted successfully',
        item: deletedItem
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
 * Create a new collection
 * 
 * Request body:
 * - name: Name of the collection
 */
app.post('/db', (req: express.Request, res: express.Response) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Collection name is required'
      });
    }
    
    if (collections[name]) {
      return res.status(409).json({
        success: false,
        error: 'Collection already exists'
      });
    }
    
    // Create new collection
    collections[name] = [];
    
    return res.status(201).json({
      success: true,
      data: {
        name,
        itemCount: 0
      }
    });
  } catch (error) {
    console.error('Error creating collection:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to create collection'
    });
  }
});

/**
 * List all collections
 */
app.get('/db', (req: express.Request, res: express.Response) => {
  try {
    const collectionList = Object.keys(collections).map(name => ({
      name,
      itemCount: collections[name].length
    }));
    
    return res.status(200).json({
      success: true,
      data: collectionList
    });
  } catch (error) {
    console.error('Error listing collections:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to list collections'
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`💾 Database Service running on port ${PORT}`);
}); 