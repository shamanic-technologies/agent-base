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
router.post('/api-keys', async (req: Request, res: Response): Promise<void> => {
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
    if (!keyData.key_id || !keyData.name || !keyData.key_prefix || !keyData.hashed_key) {
      const missing = [];
      if (!keyData.key_id) missing.push('key_id');
      if (!keyData.name) missing.push('name');
      if (!keyData.key_prefix) missing.push('key_prefix');
      if (!keyData.hashed_key) missing.push('hashed_key');
      res.status(400).json({ success: false, error: `Required fields missing: ${missing.join(', ')}` });
      return;
    }

    console.log(`Creating API key metadata for user: ${userId}, key_id: ${keyData.key_id}`);

    // Call service to create API key
    const result = await createApiKey(keyData, userId);

    if (!result.success) {
      if (result.error?.includes('already exists')) {
        res.status(409).json({ success: false, error: result.error });
      } else {
        res.status(500).json({ success: false, error: result.error || 'Failed to create API key' });
      }
      return;
    }

    res.status(201).json({
      success: true,
      data: result.data
    });

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
router.get('/api-keys', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required (x-user-id header missing)' });
      return;
    }

    // Call service to get API keys
    const result = await getApiKeys(userId);

    if (!result.success) {
      res.status(500).json({ success: false, error: result.error || 'Failed to fetch API keys' });
      return;
    }

    res.status(200).json({
      success: true,
      data: result.data
    });

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
router.post('/api-keys/validate', async (req: Request, res: Response): Promise<void> => {
  try {
    const updateData = req.body as ValidateApiKeyRequest;

    // Validate required fields
    if (!updateData.hashed_key || !updateData.key_prefix) {
      const missing = [];
      if (!updateData.hashed_key) missing.push('hashed_key');
      if (!updateData.key_prefix) missing.push('key_prefix');
      res.status(400).json({ success: false, error: `Required fields missing: ${missing.join(', ')}` });
      return;
    }

    console.log(`Validating API key with prefix: ${updateData.key_prefix}`);

    // Call service to update API key
    const result = await validateApiKey(updateData.hashed_key, updateData.key_prefix);

    if (!result.success) {
      if (result.error?.includes('Invalid API key')) {
        res.status(404).json({ success: false, error: 'Invalid API key' });
      } else {
        res.status(500).json({ success: false, error: result.error || 'Failed to update API key usage' });
      }
      return;
    }

    res.status(200).json({
      success: true,
      data: result.data
    });

  } catch (error: any) {
    console.error('Error updating API key usage:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Database operation failed'
    });
  }
});

export default router; 