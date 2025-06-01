/**
 * API Key routes for managing metadata (secrets stored elsewhere)
 */
import { Router, Request, Response } from 'express';
import { ApiKey, CreateApiKeyRequest, ServiceResponse, ValidateApiKeyRequest } from '@agent-base/types';
import { upsertApiKey, getApiKeys, validateApiKey } from '../services/api-keys.js';

const router = Router();

/**
 * Create API Key Metadata
 * Stores the non-sensitive information about an API key.
 * Expects key details in the body and userId from header.
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    // Extract required metadata from body
    const { keyId, name, keyPrefix, hashedKey } : CreateApiKeyRequest = req.body;
    // Get userId strictly from header
    const platformUserId = req.headers['x-platform-user-id'] as string;
    const platformOrgId = req.headers['x-platform-org-id'] as string;

    // Validate required fields
    if (!platformUserId) {
      res.status(401).json({ success: false, error: 'Authentication required (x-user-id header missing)' });
      return;
    }
    if (!platformOrgId) {
      res.status(401).json({ success: false, error: 'Authentication required (x-platform-org-id header missing)' });
      return;
    }
    if (!keyId || !name || !keyPrefix || !hashedKey) {
      const missing = [];
      if (!keyId) missing.push('keyId');
      if (!name) missing.push('name');
      if (!keyPrefix) missing.push('keyPrefix');
      if (!hashedKey) missing.push('hashedKey');
      console.error(`[DB Service /] Required fields missing: ${missing.join(', ')}`);
      res.status(400).json({ success: false, error: `Required fields missing: ${missing.join(', ')}` });
      return;
    }

    // Call service to create API key
    const createResponse = await upsertApiKey({ keyId, name, keyPrefix, hashedKey }, platformUserId, platformOrgId);

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
      console.error('[DB Service /] Authentication required (x-platform-user-id header missing)');
      res.status(401).json({ success: false, error: 'Authentication required (x-platform-user-id header missing)' });
      return;
    }

    // Call service to get API keys
    const getResponse = await getApiKeys(platformUserId);

    if (!getResponse.success) {
      console.error(`[DB Service /] Error fetching API keys: ${getResponse.error}`);
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
    const { hashedKey, keyPrefix } : ValidateApiKeyRequest = req.body;

    // Validate required fields
    if (!hashedKey || !keyPrefix) {
      const missing = [];
      if (!hashedKey) missing.push('hashedKey');
      if (!keyPrefix) missing.push('keyPrefix');
      console.error(`[DB Service /validate] Required fields missing: ${missing.join(', ')}`);
      res.status(400).json({ success: false, error: `Required fields missing: ${missing.join(', ')}` });
      return;
    }

    // Call service to update API key
    const validateResponse: ServiceResponse<ApiKey> = await validateApiKey({ hashedKey, keyPrefix });

    if (!validateResponse.success) {
      if (validateResponse.error?.includes('Invalid API key')) {
        console.error(`[DB Service /validate] Invalid API key: ${hashedKey} with prefix: ${keyPrefix}`);
        res.status(404).json(validateResponse);
      } else {
        console.error(`[DB Service /validate] Error validating API key: ${hashedKey} with prefix: ${keyPrefix}`);
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