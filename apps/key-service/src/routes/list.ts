/**
 * Route handler for listing API keys
 */
import { Router } from 'express';
import * as dbService from '../services/dbService.js';
import { ErrorResponse, SuccessResponse } from '@agent-base/agents';
import { ApiKeyMetadata } from '@agent-base/agents';

const router = Router();

/**
 * List API key metadata for a user
 * GET /keys
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required (x-user-id header missing)' });
    }

    console.log(`Fetching API key metadata for user: ${userId}`);
    const keys = await dbService.getUserApiKeys(userId);
    
    if (keys === null) {
      throw new Error('Failed to fetch API keys metadata');
    }

    console.log(`Found ${keys.length} API keys for user ${userId}`);
    return res.status(200).json({ success: true, data: keys } as SuccessResponse<ApiKeyMetadata[]>);
  } catch (error) {
    console.error('Error listing API keys:', error instanceof Error ? error.message : error);
    return res.status(500).json({ success: false, error: 'Internal server error while listing API keys' } as ErrorResponse);
  }
});

export default router; 