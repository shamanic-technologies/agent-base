/**
 * API key retrieval endpoint
 * Retrieves the API key from the secret service for a specific user and key id
 */
import { Router } from 'express';
import { BaseResponse, ServiceResponse } from '@agent-base/agents';
import { getSecret } from '../services/secretService.js';
import { getUserApiKeys } from '../services/dbService.js';

/**
 * Simple response for API key retrieval
 */
interface ApiKeySecretResponse extends BaseResponse {
  apiKey?: string;
}

const router = Router();

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

    // Verify that the user owns this key
    console.log(`Verifying ownership of key ${keyId} for user ${userId}`);
    const userKeys = await getUserApiKeys(userId);
    
    if (!userKeys) {
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve user keys'
      });
    }
    
    const keyExists = userKeys.some(key => key.key_id === keyId);
    if (!keyExists) {
      return res.status(403).json({
        success: false,
        error: 'Key not found or does not belong to user'
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