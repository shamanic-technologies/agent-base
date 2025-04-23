/**
 * API key retrieval endpoint
 * Retrieves the API key from the secret service for a specific user and key id
 */
import { Router } from 'express';
import { getUserApiKeys } from '../services/dbService.js';
import { createApiKeyMetadata, getSecretWebClient, storeSecretWebClient } from '@agent-base/api-client';
import { CreateApiKeyRequest, GetSecretRequest, PlatformApiKeySecretType, SecretValue, ServiceResponse, StoreSecretRequest, UserType, UtilityProvider, UtilitySecretType } from '@agent-base/types';
import { generateApiKey, getKeyPrefix, hashApiKey } from '../utils/apiKeyUtils.js';
import { v4 as uuidv4 } from 'uuid';

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
    let platformApiKey: string | null = null;
    let keyId: string | null = null;

    if (!platformUserId) {
      console.error('User authentication required: x-platform-user-id header missing');
      return res.status(401).json({
        success: false,
        error: 'User authentication required: x-platform-user-id header missing'
      });
    }

    if (!keyName) {
      console.error('Key name is required as a query parameter');
      return res.status(400).json({
        success: false,
        error: 'Key name is required as a query parameter'
      });
    }

    // Get all user keys and filter by name
    const userKeys = await getUserApiKeys(platformUserId);
    
    if (!userKeys.success) {
      console.error('Error retrieving user keys:', userKeys.error);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve user keys'
      });
    }
    
    // Find the key with the matching name
    const key = userKeys.data.find(key => key.name === keyName);

    if (key) {
      keyId = key.keyId;
      // Get API Key from secret service
      const getSecretRequest: GetSecretRequest = {
        userType: UserType.Platform,
        secretUtilityProvider: UtilityProvider.AGENT_BASE,
        secretType: `api_key_${keyId}` as PlatformApiKeySecretType
      };
      const secretValueResponse: ServiceResponse<SecretValue> = await getSecretWebClient(platformUserId, getSecretRequest);
      
      if (!secretValueResponse.success) {
        console.error('Error retrieving API key secret:', secretValueResponse.error);
        return res.status(404).json(secretValueResponse);
      }
      platformApiKey = secretValueResponse.data.value;

      // Check if the retrieved key value is valid
      if (platformApiKey) {

        // Return just the secret value (as raw text, Content-Type will be set automatically)
        // The client expects raw text for 200 OK status
        res.setHeader('Content-Type', 'text/plain'); 

        return res.status(200).json(platformApiKey);
      } 
    } 
    // Generate new API key
    platformApiKey = generateApiKey();
    keyId = uuidv4();
    const keyPrefix = getKeyPrefix(platformApiKey);
    // Prepare metadata payload
    const keyMetadataPayload: CreateApiKeyRequest = {
      keyId,
      name: keyName,
      keyPrefix,
      hashedKey: hashApiKey(platformApiKey),
    };

    const dbResponse = await createApiKeyMetadata(keyMetadataPayload, platformUserId);

    if (!dbResponse.success) {
      console.error('Error creating API key:', dbResponse.error);
      return res.status(500).json(dbResponse);
    }

    //In any case store secret
    const requestData: StoreSecretRequest = {
      userType: UserType.Platform,
      secretUtilityProvider: UtilityProvider.AGENT_BASE,
      secretType: `api_key_${keyId}` as PlatformApiKeySecretType,
      secretValue: platformApiKey,
    };
    const storeResponse = await storeSecretWebClient(platformUserId, requestData);
    if (!storeResponse.success) {
      console.error('Failed to store secret:', storeResponse.error);
      return storeResponse;
    }

    return res.status(201).json(platformApiKey);
  
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
    const getSecretRequest: GetSecretRequest = {
      userType: UserType.Platform,
      secretUtilityProvider: UtilityProvider.AGENT_BASE,
      secretType: `api_key_${keyId}` as PlatformApiKeySecretType
    };
    const secretValueResponse: ServiceResponse<SecretValue> = await getSecretWebClient(platformUserId, getSecretRequest);
    
    if (!secretValueResponse.success) {
      return res.status(404).json(secretValueResponse);
    }
    const platformApiKey = secretValueResponse.data.value;

    // Check if the retrieved key value is valid
    if (!platformApiKey) {
      console.error('Retrieved API key secret value is empty for key:', keyId);
      return res.status(404).json({
        success: false,
        error: 'API key secret not found or empty'
      });
    }
    // Return the secret value (as raw text)
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send(platformApiKey);
    
  } catch (error) {
    console.error('Error retrieving API key:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error while retrieving API key'
    });
  }
});

export default router; 