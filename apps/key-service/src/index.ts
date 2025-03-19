/**
 * HelloWorld Key Service
 * 
 * A simple service for managing API keys.
 * Uses database-service for persistent storage.
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { randomBytes, createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import path from 'path';
import fs from 'fs';

// Load environment variables based on NODE_ENV
const NODE_ENV = process.env.NODE_ENV || 'development';

// Only load from .env file in development
if (NODE_ENV === 'development') {
  const envFile = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envFile)) {
    console.log(`Loading environment from ${envFile}`);
    dotenv.config({ path: envFile });
  } else {
    console.log(`Environment file ${envFile} not found, using default environment variables.`);
  }
} else {
  console.log('Production environment detected, using Railway configuration.');
}

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3003;

// Database service URL - make sure this is correctly set in .env.local
const DB_SERVICE_URL = process.env.DB_SERVICE_URL || 'http://localhost:3006';
console.log(`Using database service at: ${DB_SERVICE_URL}`);

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
app.get('/health', (req: express.Request, res: express.Response) => {
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
app.post('/keys', async (req: express.Request, res: express.Response) => {
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
    
    // Prepare data for database storage
    const keyData = {
      userId,
      name,
      keyPrefix,
      keyHash,
      id,
      createdAt: new Date().toISOString(),
      lastUsed: null,
      active: true
    };
    
    console.log(`Creating API key for user ${userId} with name: ${name}`);
    
    // Save to database service
    const response = await axios.post(`${DB_SERVICE_URL}/api-keys`, keyData);
    
    if (!response.data.success) {
      console.error('Failed to store API key in database:', response.data);
      throw new Error('Failed to store API key in database');
    } else {
      console.log('Successfully stored API key in database:', response.data.data.id);
    }

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
app.get('/keys/:id', async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    
    console.log(`Fetching API key with ID: ${id}`);
    
    // Query database for key by ID - use the proper endpoint
    const response = await axios.get(`${DB_SERVICE_URL}/db/api_keys`, {
      params: {
        query: JSON.stringify({ 'data.id': id })
      }
    });
    
    if (!response.data.success || !response.data.data || response.data.data.items.length === 0) {
      console.log('API key not found in database');
      return res.status(404).json({
        success: false,
        error: 'API key not found'
      });
    }
    
    const apiKey = response.data.data.items[0].data;
    console.log(`Found API key: ${apiKey.id}`);
    
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
  } catch (error) {
    console.error('Error fetching API key:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve API key'
    });
  }
});

/**
 * List all API keys for a user
 */
app.get('/keys', async (req: express.Request, res: express.Response) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }
    
    console.log(`Fetching API keys for user: ${userId}`);
    
    // Fetch keys from database service
    const response = await axios.get(`${DB_SERVICE_URL}/api-keys`, {
      params: { userId }
    });
    
    if (!response.data.success) {
      console.error('Failed to fetch API keys from database:', response.data);
      throw new Error('Failed to fetch API keys from database');
    }
    
    // Transform the response to match our API format
    const userKeys = response.data.data.items.map((item: any) => {
      const keyData = item.data;
      return {
        id: keyData.id,
        name: keyData.name,
        keyPrefix: keyData.keyPrefix,
        createdAt: keyData.createdAt,
        lastUsed: keyData.lastUsed,
        active: keyData.active
      };
    });
    
    console.log(`Found ${userKeys.length} API keys for user ${userId}`);
  
    return res.status(200).json({
      success: true,
      data: userKeys
    });
  } catch (error) {
    console.error('Error listing API keys:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to list API keys'
    });
  }
});

/**
 * Revoke (deactivate) an API key
 */
app.delete('/keys/:id', async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    
    console.log(`Revoking API key with ID: ${id}`);
    
    // Find the key
    const response = await axios.get(`${DB_SERVICE_URL}/db/api_keys`, {
      params: {
        query: JSON.stringify({ 'data.id': id })
      }
    });
    
    if (!response.data.success || !response.data.data.items.length) {
      console.log('API key not found for revocation');
      return res.status(404).json({
        success: false,
        error: 'API key not found'
      });
    }
    
    const keyRecord = response.data.data.items[0];
    const keyData = keyRecord.data;
    
    // Update the key to be inactive
    keyData.active = false;
    keyData.updated_at = new Date().toISOString();
    
    console.log(`Updating API key ${id} to inactive`);
    
    // Update in database
    await axios.put(`${DB_SERVICE_URL}/db/api_keys/${keyRecord.id}`, {
      data: keyData
    });
    
    return res.status(200).json({
      success: true,
      message: 'API key revoked successfully'
    });
  } catch (error) {
    console.error('Error revoking API key:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to revoke API key'
    });
  }
});

/**
 * Validate an API key
 */
app.post('/keys/validate', async (req: express.Request, res: express.Response) => {
  try {
    const { apiKey } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'API key is required'
      });
    }
    
    const keyHash = hashApiKey(apiKey);
    console.log(`Validating API key (hash: ${keyHash.substring(0, 10)}...)`);
    
    // Query database for key by hash
    const response = await axios.get(`${DB_SERVICE_URL}/db/api_keys`, {
      params: {
        query: JSON.stringify({ 'data.keyHash': keyHash })
      }
    });
    
    if (!response.data.success || !response.data.data.items.length) {
      console.log('Invalid API key - not found in database');
      return res.status(401).json({
        success: false,
        error: 'Invalid or revoked API key'
      });
    }
    
    const keyRecord = response.data.data.items[0];
    const keyData = keyRecord.data;
    
    // Check if key is active
    if (!keyData.active) {
      console.log('API key is revoked');
      return res.status(401).json({
        success: false,
        error: 'API key has been revoked'
      });
    }
    
    // Update last used timestamp
    keyData.lastUsed = new Date().toISOString();
    console.log(`Updating last used timestamp for API key ${keyData.id}`);
    
    // Update in database
    await axios.put(`${DB_SERVICE_URL}/db/api_keys/${keyRecord.id}`, {
      data: keyData
    });
    
    return res.status(200).json({
      success: true,
      data: {
        userId: keyData.userId,
        keyId: keyData.id
      }
    });
  } catch (error) {
    console.error('Error validating API key:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to validate API key'
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Key Service running on port ${PORT}`);
  console.log(`Using database service at: ${DB_SERVICE_URL}`);
}); 