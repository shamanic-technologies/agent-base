/**
 * HelloWorld Key Service (Mock)
 * 
 * A simplified version of the Key Service for testing.
 * Does not require Supabase, storing data in-memory instead.
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { randomBytes, createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3002;

// In-memory database
const apiKeys: any[] = [];

// Middleware
app.use(cors());
app.use(express.json());

// Helper function to generate API key
function generateApiKey(): string {
  const keyBuffer = randomBytes(32);
  const timestamp = Date.now().toString(36); // Convert timestamp to base36 for compactness
  return `agbase_${timestamp}_${keyBuffer.toString('hex')}`;
}

// Helper function to hash API key
function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

/**
 * Create a new API key
 * 
 * Request body:
 * - userId: ID of the user
 * - name: Name for the API key
 * 
 * Response:
 * - success: boolean
 * - apiKey: Complete API key (only returned once)
 * - data: API key data (id, prefix, etc.)
 */
app.post('/keys', async (req, res) => {
  try {
    const { userId, name } = req.body;

    if (!userId || !name) {
      return res.status(400).json({
        success: false,
        error: 'User ID and name are required'
      });
    }

    // Generate API key
    const apiKey = generateApiKey();
    const keyHash = hashApiKey(apiKey);
    const keyPrefix = apiKey.substring(0, 16);
    const id = uuidv4();
    
    // Store in in-memory database
    const keyData = {
      id,
      userId,
      name,
      keyPrefix,
      keyHash,
      createdAt: new Date().toISOString(),
      lastUsed: null,
      active: true
    };
    
    apiKeys.push(keyData);

    return res.status(201).json({
      success: true,
      apiKey, // Full API key - only shown once
      data: {
        id,
        name,
        keyPrefix,
        createdAt: keyData.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to create API key'
    });
  }
});

/**
 * Get API key information (without exposing the actual key)
 */
app.get('/keys/:id', (req, res) => {
  const { id } = req.params;
  
  const apiKey = apiKeys.find(key => key.id === id);
  
  if (!apiKey) {
    return res.status(404).json({
      success: false,
      error: 'API key not found'
    });
  }
  
  return res.status(200).json({
    success: true,
    data: {
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      createdAt: apiKey.createdAt,
      lastUsed: apiKey.lastUsed,
      active: apiKey.active
    }
  });
});

/**
 * List all API keys for a user
 */
app.get('/keys', (req, res) => {
  const { userId } = req.query;
  
  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'User ID is required'
    });
  }
  
  const userKeys = apiKeys
    .filter(key => key.userId === userId)
    .map(key => ({
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      createdAt: key.createdAt,
      lastUsed: key.lastUsed,
      active: key.active
    }));
  
  return res.status(200).json({
    success: true,
    data: userKeys
  });
});

/**
 * Revoke (deactivate) an API key
 */
app.delete('/keys/:id', (req, res) => {
  const { id } = req.params;
  
  const keyIndex = apiKeys.findIndex(key => key.id === id);
  
  if (keyIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'API key not found'
    });
  }
  
  // Deactivate the key
  apiKeys[keyIndex].active = false;
  
  return res.status(200).json({
    success: true,
    message: 'API key revoked successfully'
  });
});

/**
 * Validate an API key
 */
app.post('/keys/validate', (req, res) => {
  const { apiKey } = req.body;
  
  if (!apiKey) {
    return res.status(400).json({
      success: false,
      error: 'API key is required'
    });
  }
  
  const keyHash = hashApiKey(apiKey);
  const matchingKey = apiKeys.find(key => key.keyHash === keyHash && key.active);
  
  if (!matchingKey) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or revoked API key'
    });
  }
  
  // Update last used timestamp
  matchingKey.lastUsed = new Date().toISOString();
  
  return res.status(200).json({
    success: true,
    data: {
      userId: matchingKey.userId,
      keyId: matchingKey.id
    }
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Key Service running on port ${PORT}`);
}); 