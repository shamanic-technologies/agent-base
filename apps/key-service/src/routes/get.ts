/**
 * API key retrieval endpoint
 * Retrieves the API key from the secret service for a specific user and key id
 */
import { Router } from 'express';
import { getUserApiKeys } from '../services/dbService.js';
import { createApiKeyMetadata, getSecretWebClient, storeSecretWebClient } from '@agent-base/api-client';
import { ApiKey, CreateApiKeyRequest, GetSecretRequest, PlatformApiKeySecretType, SecretValue, ServiceResponse, StoreSecretRequest, UserType, UtilityProvider, UtilityProviderEnum, UtilitySecretType } from '@agent-base/types';
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
router.get('/by-name', async (req, res): Promise<void> => {
  try {
    const keyName = req.query.name as string;
    const platformUserId = req.headers['x-platform-user-id'] as string;
    const platformOrganizationId = req.headers['x-platform-organization-id'] as string;
    let platformApiKey: string | null = null;
    let keyId: string | null = null;

    if (!platformUserId) {
      console.error('User authentication required: x-platform-user-id header missing');
      res.status(401).json({
        success: false,
        error: 'User authentication required: x-platform-user-id header missing'
      });
      return;
    }
    if (!platformOrganizationId) {
      console.error('User authentication required: x-platform-organization-id header missing');
      res.status(401).json({
        success: false,
        error: 'User authentication required: x-platform-organization-id header missing'
      });
      return;
    }

    if (!keyName) {
      console.error('Key name is required as a query parameter');
      res.status(400).json({
        success: false,
        error: 'Key name is required as a query parameter'
      });
      return;
    }
    console.debug('➡️ keyName', keyName);
    // Get all user keys and filter by name
    const userKeys: ServiceResponse<ApiKey[]> = await getUserApiKeys(platformUserId, platformOrganizationId);
    console.debug('➡️ userKeys', userKeys);
    if (!userKeys.success) {
      console.error('Error retrieving user keys:', userKeys.error);
      res.status(500).json(userKeys);
      return;
    }
    
    // Find the key with the matching name
    const key = userKeys.data.find(key => key.name === keyName);

    if (key) {
      keyId = key.keyId;
      // Get API Key from secret service
      const getSecretRequest: GetSecretRequest = {
        userType: UserType.Platform,
        secretUtilityProvider: UtilityProviderEnum.AGENT_BASE,
        secretType: `api_key_${keyId}` as PlatformApiKeySecretType
      };
      console.debug('➡️ getSecretRequest', getSecretRequest, null, 2);
      const secretValueResponse: ServiceResponse<SecretValue> = await getSecretWebClient(platformUserId, platformOrganizationId, getSecretRequest);
      console.debug('➡️ secretValueResponse', secretValueResponse);
      
      if (!secretValueResponse.success) {
        console.error('Error retrieving API key secret:', secretValueResponse.error);
        res.status(404).json(secretValueResponse);
        return;
      }
      platformApiKey = secretValueResponse.data.value;

      // Check if the retrieved key value is valid
      if (platformApiKey) {
        // Return just the secret value (as raw text, Content-Type will be set automatically)
        // The client expects raw text for 200 OK status
        res.setHeader('Content-Type', 'text/plain'); 

        res.status(200).json(secretValueResponse);
        return;
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

    const createResponse : ServiceResponse<ApiKey> = await createApiKeyMetadata(keyMetadataPayload, platformUserId, platformOrganizationId);

    if (!createResponse.success) {
      console.error('Error creating API key:', createResponse.error);
      res.status(500).json(createResponse);
      return;
    }

    //In any case store secret
    const requestData: StoreSecretRequest = {
      userType: UserType.Platform,
      secretUtilityProvider: UtilityProviderEnum.AGENT_BASE,
      secretType: `api_key_${keyId}` as PlatformApiKeySecretType,
      secretValue: platformApiKey,
    };
    const storeResponse : ServiceResponse<string> = await storeSecretWebClient(platformUserId, platformOrganizationId, requestData);
    if (!storeResponse.success) {
      console.error('Failed to store secret:', storeResponse.error);
      res.status(500).json(storeResponse);
      return;
    }
    const serviceResponse : ServiceResponse<SecretValue> = {
      success: true,
      data: {
        value: platformApiKey,
      },
    };
    res.status(201).json(serviceResponse);
    return;
  
  } catch (error) {
    console.error('Error retrieving or creating API key by name:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while retrieving or creating API key'
    });
    return;
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
router.get('/:keyId', async (req, res): Promise<void> => {
  try {
    const keyId = req.params.keyId;
    const platformUserId = req.headers['x-platform-user-id'] as string;
    const platformOrganizationId = req.headers['x-platform-organization-id'] as string;

    if (!platformUserId) {
      res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
      return;
    }
    if (!platformOrganizationId) {
      res.status(401).json({
        success: false,
        error: 'User authentication required: x-platform-organization-id header missing'
      });
      return;
    }
    if (!keyId) {
      res.status(400).json({
        success: false,
        error: 'Key ID is required'
      });
      return;
    }
    
    // Get the API key from the secret service
    const getSecretRequest: GetSecretRequest = {
      userType: UserType.Platform,
      secretUtilityProvider: UtilityProviderEnum.AGENT_BASE,
      secretType: `api_key_${keyId}` as PlatformApiKeySecretType
    };
    const secretValueResponse: ServiceResponse<SecretValue> = await getSecretWebClient(platformUserId, platformOrganizationId, getSecretRequest);
    
    if (!secretValueResponse.success) {
      res.status(404).json(secretValueResponse);
      return;
    }
    const platformApiKey = secretValueResponse.data.value;

    // Check if the retrieved key value is valid
    if (!platformApiKey) {
      console.error('Retrieved API key secret value is empty for key:', keyId);
      res.status(404).json({
        success: false,
        error: 'API key secret not found or empty'
      });
      return;
    }
    // Return the secret value (as raw text)
    res.setHeader('Content-Type', 'text/plain');
    res.status(200).send(platformApiKey);
    return;
    
  } catch (error) {
    console.error('Error retrieving API key:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while retrieving API key'
    });
    return;
  }
});

export default router; 