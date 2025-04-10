/**
 * Routes for managing API Keys (/keys)
 */
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { DB_SERVICE_URL } from '../config.js';
import { storeSecret, getSecret } from '../utils/secrets.js';
import { generateApiKey } from '../utils/apiKeyUtils.js';
import { ApiKey, ApiKeyCreateResponse } from '@agent-base/agents/src/types/api-keys.js';

const router = express.Router();

// Define a flexible type for the database response reused in multiple routes
type DbResponse<T> = 
    | { success: true; data: T; error?: never }
    | { success: false; data?: never; error: string };

/**
 * Create a new API key
 * Generates key, stores secret, saves metadata.
 */
router.post('/', async (req: express.Request, res: express.Response) => {
  try {
    const { name } = req.body;
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required (x-user-id header missing)' });
    }
    if (!name) {
      return res.status(400).json({ success: false, error: 'Key name is required' });
    }

    const apiKey = generateApiKey();
    const keyId = uuidv4();
    const key_prefix = apiKey.substring(0, 16);

    console.log(`Generated new key. ID: ${keyId}, Prefix: ${key_prefix}, User: ${userId}`);

    await storeSecret(userId, keyId, apiKey);
    console.log(`Successfully initiated secret storage for type api_key_${keyId}`);

    const keyMetadataPayload = {
      key_id: keyId,
      name,
      key_prefix: key_prefix,
    };

    console.log(`Saving metadata for key ${keyId} to database...`);
    const dbResponse = await axios.post(`${DB_SERVICE_URL}/api-keys`, keyMetadataPayload, {
      headers: { 'x-user-id': userId }
    });

    if (!dbResponse.data?.success) {
      console.error('Failed to store API key metadata:', dbResponse.data || 'No response data');
      throw new Error('Failed to store API key metadata');
    }

    const createdMetadata = dbResponse.data.data as ApiKey;
    console.log(`Successfully stored metadata for key ${keyId}`);

    const responsePayload: ApiKeyCreateResponse = {
      ...createdMetadata,
      apiKey: apiKey,
    };

    return res.status(201).json({ success: true, data: responsePayload });

  } catch (error) {
    console.error('Error creating API key:', error instanceof Error ? error.message : error);
     if (axios.isAxiosError(error)) {
        console.error('Axios error details:', error.response?.data || error.message);
        return res.status(error.response?.status || 500).json({
            success: false,
            error: error.response?.data?.error || 'Failed to communicate with database service'
        });
    }
    return res.status(500).json({ success: false, error: 'Internal server error while creating API key' });
  }
});

/**
 * List API key metadata for a user
 */
router.get('/', async (req: express.Request, res: express.Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required (x-user-id header missing)' });
    }

    console.log(`Fetching API key metadata for user: ${userId}`);
    const response = await axios.get< DbResponse<ApiKey[]> >(`${DB_SERVICE_URL}/api-keys`, {
      headers: { 'x-user-id': userId }
    });

    if (!response.data?.success) {
      console.error('Failed to fetch API keys metadata:', response.data || 'No response data');
      throw new Error('Failed to fetch API keys metadata');
    }

    console.log(`Found ${response.data.data.length} API keys for user ${userId}`);
    return res.status(200).json({ success: true, data: response.data.data });

  } catch (error) {
    console.error('Error listing API keys:', error instanceof Error ? error.message : error);
     if (axios.isAxiosError(error)) {
        console.error('Axios error details:', error.response?.data || error.message);
        return res.status(error.response?.status || 500).json({
            success: false,
            error: error.response?.data?.error || 'Failed to communicate with database service'
        });
    }
    return res.status(500).json({ success: false, error: 'Internal server error while listing API keys' });
  }
});

/**
 * Get specific API key metadata
 */
router.get('/:keyId', async (req: express.Request, res: express.Response) => {
  try {
    const { keyId } = req.params;
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required (x-user-id header missing)' });
    }
    if (!keyId) {
         return res.status(400).json({ success: false, error: 'Key ID parameter is required.' });
    }

    console.log(`Fetching API key metadata for key: ${keyId}, user: ${userId}`);
    const response = await axios.get<DbResponse<ApiKey>>(`${DB_SERVICE_URL}/api-keys/${keyId}`, {
      headers: { 'x-user-id': userId }
    });

    if (!response.data?.success) {
        console.log(`API key metadata not found or error for key: ${keyId}`);
         const status = axios.isAxiosError(response as any) ? (response as any).response?.status : 404;
         const errorMessage = response.data?.error || 'API key not found or access denied';
         return res.status(status || 404).json({ success: false, error: errorMessage });
    }
    
    console.log(`Found API key metadata for key: ${keyId}`);
    return res.status(200).json({ success: true, data: response.data.data });

  } catch (error) {
    console.error('Error fetching specific API key:', error instanceof Error ? error.message : error);
     if (axios.isAxiosError(error)) {
        console.error('Axios error details:', error.response?.data || error.message);
         return res.status(error.response?.status || 500).json({
            success: false,
            error: error.response?.data?.error || 'Failed to retrieve API key metadata'
         });
    }
    return res.status(500).json({ success: false, error: 'Internal server error while fetching API key' });
  }
});

/**
 * Deactivate (revoke) an API key
 */
router.delete('/:keyId', async (req: express.Request, res: express.Response) => {
  try {
    const { keyId } = req.params;
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required (x-user-id header missing)' });
    }
     if (!keyId) {
         return res.status(400).json({ success: false, error: 'Key ID parameter is required.' });
    }

    console.log(`Deactivating API key: ${keyId} for user: ${userId}`);
    const response = await axios.delete(`${DB_SERVICE_URL}/api-keys/${keyId}`, {
      headers: { 'x-user-id': userId }
    });

    if (!response.data?.success) {
       console.error('Failed to deactivate API key in database:', response.data || 'No response data');
        const status = axios.isAxiosError(response as any) ? (response as any).response?.status : 500;
         return res.status(status || 500).json({
            success: false,
            error: response.data?.error || 'Failed to deactivate API key'
         });
    }

    console.log(`Successfully deactivated API key: ${keyId}`);
    return res.status(200).json({
      success: true,
      message: response.data.message || `API key ${keyId} deactivated successfully.`,
      data: response.data.data 
    });

  } catch (error) {
    console.error('Error deactivating API key:', error instanceof Error ? error.message : error);
     if (axios.isAxiosError(error)) {
        console.error('Axios error details:', error.response?.data || error.message);
         return res.status(error.response?.status || 500).json({
            success: false,
            error: error.response?.data?.error || 'Failed to deactivate API key'
         });
    }
    return res.status(500).json({ success: false, error: 'Internal server error while deactivating API key' });
  }
});

/**
 * Validate an API key
 */
router.post('/validate', async (req: express.Request, res: express.Response) => {
  try {
    const { apiKey } = req.body;

    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(400).json({ success: false, error: 'API key is required' });
    }
    if (!apiKey.startsWith('agbase_')) {
         return res.status(401).json({ success: false, error: 'Invalid API key format.' });
    }

    const keyPrefix = apiKey.substring(0, 16);
    console.log(`Attempting validation for key prefix: ${keyPrefix}`);

    let potentialKeyMetadatas: ApiKey[] = [];
    try {
        const dbResponse = await axios.get<DbResponse<ApiKey[]>>(`${DB_SERVICE_URL}/api-keys`, {
            params: { key_prefix: keyPrefix } 
        });
        if (dbResponse.data?.success && dbResponse.data.data.length > 0) {
            potentialKeyMetadatas = dbResponse.data.data;
        } else {
             console.log(`No key metadata found for prefix ${keyPrefix}`);
             return res.status(401).json({ success: false, error: 'Invalid or revoked API key (prefix not found).' });
        }
    } catch (dbError) {
         console.error('Error querying database by key prefix:', dbError);
         return res.status(500).json({ success: false, error: 'Key validation failed (database error).' });
    }

    let validKeyMetadata: ApiKey | null = null;
    for (const metadata of potentialKeyMetadatas) {
      console.log(`Checking secret for key ID ${metadata.key_id} owned by user ${metadata.user_id}`);
      const storedApiKey = await getSecret(metadata.user_id, metadata.key_id);

      if (storedApiKey === apiKey) {
        console.log(`Secret for key ${metadata.key_id} matches provided key.`);
        validKeyMetadata = metadata;
        break; 
      } else {
         console.log(`Secret check failed for key ${metadata.key_id}. Value mismatch or secret not found.`);
      }
    }

    if (!validKeyMetadata) {
      console.log(`No valid and active key found matching prefix ${keyPrefix} and secret value.`);
      return res.status(401).json({ success: false, error: 'Invalid or revoked API key.' });
    }

    try {
        const lastUsedUpdate = new Date().toISOString();
        console.log(`Updating last used timestamp for key ${validKeyMetadata.key_id} to ${lastUsedUpdate}`);
        await axios.put(`${DB_SERVICE_URL}/api-keys/${validKeyMetadata.key_id}`,
            { last_used: lastUsedUpdate },
            { headers: { 'x-user-id': validKeyMetadata.user_id } } 
        );
        console.log(`Successfully updated last used time for key ${validKeyMetadata.key_id}`);
    } catch (updateError) {
        console.error(`Failed to update last used time for key ${validKeyMetadata.key_id}:`, updateError);
    }

    return res.status(200).json({
      success: true,
      data: {
        userId: validKeyMetadata.user_id,
        keyId: validKeyMetadata.key_id
      }
    });

  } catch (error) {
    console.error('Error during API key validation process:', error instanceof Error ? error.message : error);
     if (error instanceof Error && error.message.startsWith('Failed to retrieve secret')) {
         return res.status(500).json({ success: false, error: 'Key validation failed (secret access error).' });
     }
    return res.status(500).json({
      success: false,
      error: 'Internal server error during key validation'
    });
  }
});

export default router; 