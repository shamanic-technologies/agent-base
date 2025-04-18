/**
 * API key retrieval endpoint
 * Retrieves the API key from the secret service for a specific user and key id
 */
import { Router } from 'express';
import { getUserApiKeys, createApiKey } from '../services/dbService.js';
import { getSecretWebClient } from '@agent-base/api-client';
import { GetSecretRequest, SecretValue, ServiceResponse, UserType } from '@agent-base/types';


const router = Router();

/**
 * GET /keys/by-name
 * Retrieves or creates an API key for a user by key name
 * 
 * Headers:
 * - x-platform-user-id: User ID (required)
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
    const platformUserId = req.headers['x-platform-user-id'] as string;

    if (!platformUserId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required: x-platform-user-id header missing'
      });
    }

    if (!keyName) {
      return res.status(400).json({
        success: false,
        error: 'Key name is required as a query parameter'
      });
    }

    // Get all user keys and filter by name
    console.log(`Finding key with name "${keyName}" for user ${platformUserId}`);
    const userKeys = await getUserApiKeys(platformUserId);
    
    if (!userKeys.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve user keys'
      });
    }
    
    // Find the key with the matching name
    const key = userKeys.data.find(key => key.name === keyName);
    
    // If key exists, return it
    if (key) {
      console.log(`Found existing key "${keyName}" with ID ${key.keyId}`);
      
      // Get the full API key from the secret service
      console.log(`Retrieving API key secret for key ${key.keyId}`);
      const getSecretRequest: GetSecretRequest = {
        userType: UserType.Platform,
        userId: platformUserId,
        secretType: `api_key_${key.keyId}`
      };
      const apiKeyResponse: ServiceResponse<SecretValue> = await getSecretWebClient(platformUserId, getSecretRequest);
      
      if (!apiKeyResponse.success) {
          return res.status(404).json(apiKeyResponse);
      }
      // Return just the secret value
      return res.status(200).json(apiKeyResponse);
    }
    
    // If key doesn't exist, create a new one
    console.log(`No key found with name "${keyName}", creating new key`);
    const newKeyResponse = await createApiKey(keyName, platformUserId);
    
    if (!newKeyResponse.success) {
      return res.status(500).json(newKeyResponse);
    }
    
    // Return the newly created key with 201 Created status
    return res.status(201).json(newKeyResponse);
    
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
 * - x-platform-user-id: User ID (required)
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
    const platformUserId = req.headers['x-platform-user-id'] as string;

    if (!platformUserId) {
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
    const getSecretRequest: GetSecretRequest = {
      userType: UserType.Platform,
      userId: platformUserId,
      secretType: `api_key_${keyId}`
    };
    const apiKeyResponse = await getSecretWebClient(platformUserId, getSecretRequest);
    
    if (!apiKeyResponse.success) {
      return res.status(404).json(apiKeyResponse);
    }
    
    // Return the secret value
    return res.status(200).json(apiKeyResponse);
    
  } catch (error) {
    console.error('Error retrieving API key:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error while retrieving API key'
    });
  }
});

export default router; 