/**
 * API key retrieval endpoint
 * Retrieves the API key from the secret service for a specific user and key id
 */
import { Router } from 'express';
import { BaseResponse, ServiceResponse } from '@agent-base/agents';
import { getSecret } from '../services/secretService.js';
import { getUserApiKeys, createApiKey } from '../services/dbService.js';

/**
 * Simple response for API key retrieval
 */
interface ApiKeySecretResponse extends BaseResponse {
  apiKey?: string;
}

/**
 * Response for API key with metadata retrieval
 */
interface ApiKeyWithMetadataResponse extends BaseResponse {
  data?: any;
  apiKey?: string;
}

const router = Router();

/**
 * GET /keys/by-name
 * Retrieves or creates an API key for a user by key name
 * 
 * Headers:
 * - x-user-id: User ID (required)
 * 
 * Query Parameters:
 * - name: The name of the API key to retrieve or create (required)
 * 
 * Returns:
 * - 200 with the API key value (existing key)
 * - 201 with the API key value (newly created key)
 * - 400 if name parameter is missing
 * - 401 if user is not authenticated
 * - 500 for server errors
 */
router.get('/by-name', async (req, res) => {
  try {
    const keyName = req.query.name as string;
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    if (!keyName) {
      return res.status(400).json({
        success: false,
        error: 'Key name is required as a query parameter'
      });
    }

    // Get all user keys and filter by name
    console.log(`Finding key with name "${keyName}" for user ${userId}`);
    const userKeys = await getUserApiKeys(userId);
    
    if (!userKeys) {
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve user keys'
      });
    }
    
    // Find the key with the matching name
    const keyMetadata = userKeys.find(key => key.name === keyName);
    
    // If key exists, return it
    if (keyMetadata) {
      console.log(`Found existing key "${keyName}" with ID ${keyMetadata.key_id}`);
      
      // Get the full API key from the secret service
      console.log(`Retrieving API key secret for key ${keyMetadata.key_id}`);
      const apiKey = await getSecret(userId, keyMetadata.key_id);
      
      if (!apiKey) {
        return res.status(404).json({
          success: false,
          error: 'Key secret not found'
        });
      }
      
      // Return just the secret value
      return res.status(200).json({
        success: true,
        apiKey
      } as ApiKeySecretResponse);
    }
    
    // If key doesn't exist, create a new one
    console.log(`No key found with name "${keyName}", creating new key`);
    const newKeyResult = await createApiKey(keyName, userId);
    
    if (!newKeyResult) {
      return res.status(500).json({
        success: false, 
        error: 'Failed to create API key'
      });
    }
    
    // Return the newly created key with 201 Created status
    return res.status(201).json({
      success: true,
      apiKey: newKeyResult.apiKey
    } as ApiKeySecretResponse);
    
  } catch (error) {
    console.error('Error retrieving or creating API key by name:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error while retrieving or creating API key'
    });
  }
});

/**
 * GET /keys/:keyId
 * Retrieves an API key by ID for the authenticated user
 * 
 * Headers:
 * - x-user-id: User ID (required)
 * 
 * Parameters:
 * - keyId: The ID of the API key to retrieve
 * 
 * Returns:
 * - 200 with the API key value for the specified key ID
 * - 401 if user is not authenticated
 * - 403 if the key does not belong to the user
 * - 404 if the key is not found
 * - 500 for server errors
 */
router.get('/:keyId', async (req, res) => {
  try {
    const keyId = req.params.keyId;
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    if (!keyId) {
      return res.status(400).json({
        success: false,
        error: 'Key ID is required'
      });
    }
    
    // Get the API key from the secret service
    console.log(`Retrieving API key secret for key ${keyId}`);
    const apiKey = await getSecret(userId, keyId);
    
    if (!apiKey) {
      return res.status(404).json({
        success: false,
        error: 'Key not found'
      });
    }
    
    // Return the secret value
    return res.status(200).json({
      success: true,
      apiKey
    } as ApiKeySecretResponse);
    
  } catch (error) {
    console.error('Error retrieving API key:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error while retrieving API key'
    });
  }
});

export default router; 