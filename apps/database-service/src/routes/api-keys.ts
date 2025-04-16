/**
 * API Key routes for managing metadata (secrets stored elsewhere)
 */
import { Router, Request, Response } from 'express';
import { CreateApiKeyRequest, ValidateApiKeyRequest } from '@agent-base/types';
import { createApiKey, getApiKeys, validateApiKey } from '../services/api-keys.js';

const router = Router();

/**
 * Create API Key Metadata
 * Stores the non-sensitive information about an API key.
 * Expects key details in the body and userId from header.
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    // Extract required metadata from body
    const keyData = req.body as CreateApiKeyRequest;
    // Get userId strictly from header
    const userId = req.headers['x-user-id'] as string;

    // Validate required fields
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required (x-user-id header missing)' });
      return;
    }
    if (!keyData.keyId || !keyData.name || !keyData.keyPrefix || !keyData.hashedKey) {
      const missing = [];
      if (!keyData.keyId) missing.push('keyId');
      if (!keyData.name) missing.push('name');
      if (!keyData.keyPrefix) missing.push('keyPrefix');
      if (!keyData.hashedKey) missing.push('hashedKey');
      res.status(400).json({ success: false, error: `Required fields missing: ${missing.join(', ')}` });
      return;
    }

    console.log(`Creating API key metadata for user: ${userId}, keyId: ${keyData.keyId}`);

    // Call service to create API key
    const createResponse = await createApiKey(keyData, userId);

    if (!createResponse.success) {
      if (createResponse.error?.includes('already exists')) {
        res.status(409).json(createResponse);
      } else {
        res.status(500).json(createResponse);
      }
      return;
    }

    res.status(201).json(createResponse);

  } catch (error: any) {
    console.error('Error in API key creation:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Database operation failed'
    });
  }
});

/**
 * Get API Key Metadata List for a User
 * Retrieves a list of non-sensitive key information owned by the user.
 * Uses x-user-id header for filtering.
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const platformUserId = req.headers['x-platform-user-id'] as string;

    if (!platformUserId) {
      res.status(401).json({ success: false, error: 'Authentication required (x-platform-user-id header missing)' });
      return;
    }

    // Call service to get API keys
    const getResponse = await getApiKeys(platformUserId);

    if (!getResponse.success) {
      res.status(500).json(getResponse);
      return;
    }

    res.status(200).json(getResponse);

  } catch (error: any) {
    console.error('Error fetching API keys:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Database operation failed'
    });
  }
});

/**
 * Update API Key's last_used timestamp
 * Called when an API key is used to authenticate a request.
 * Identifies the key using its hashed value and prefix.
 */
router.post('/validate', async (req: Request, res: Response): Promise<void> => {
  try {
    const validateInput = req.body as ValidateApiKeyRequest;

    // Validate required fields
    if (!validateInput.hashedKey || !validateInput.keyPrefix) {
      const missing = [];
      if (!validateInput.hashedKey) missing.push('hashedKey');
      if (!validateInput.keyPrefix) missing.push('keyPrefix');
      res.status(400).json({ success: false, error: `Required fields missing: ${missing.join(', ')}` });
      return;
    }

    console.log(`Validating API key with prefix: ${validateInput.keyPrefix}`);

    // Call service to update API key
    const validateResponse = await validateApiKey(validateInput.hashedKey, validateInput.keyPrefix);

    if (!validateResponse.success) {
      if (validateResponse.error?.includes('Invalid API key')) {
        res.status(404).json(validateResponse);
      } else {
        res.status(500).json(validateResponse);
      }
      return;
    }

    res.status(200).json(validateResponse);

  } catch (error: any) {
    console.error('Error updating API key usage:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Database operation failed'
    });
  }
});

export default router; 