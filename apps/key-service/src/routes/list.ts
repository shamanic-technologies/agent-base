/**
 * Route handler for listing API keys
 */
import { Router } from 'express';
import * as dbService from '../services/dbService.js';
import { ErrorResponse, ServiceResponse, SuccessResponse } from '@agent-base/types';
import { ApiKey } from '@agent-base/types';

const router = Router();

/**
 * List API key metadata for a user
 * GET /keys
 */
router.get('/', async (req, res) => {
  try {
    const platformUserId = req.headers['x-platform-user-id'] as string;
    
    if (!platformUserId) {
      console.error('Authentication required: x-platform-user-id header missing');
      return res.status(401).json({ success: false, error: 'Authentication required (x-platform-user-id header missing)' });
    }

    const keysResponse : ServiceResponse<ApiKey[]> = await dbService.getUserApiKeys(platformUserId);
    
    if (!keysResponse.success) {
      console.error('Error retrieving user keys:', keysResponse.error);
      return res.status(400).json(keysResponse);
    }

    return res.status(200).json(keysResponse);
  } catch (error) {
    console.error('Error listing API keys:', error instanceof Error ? error.message : error);
    return res.status(500).json({ success: false, error: 'Internal server error while listing API keys' } as ErrorResponse);
  }
});

export default router; 