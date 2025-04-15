/**
 * Route handler for validating API keys
 */
import { Router } from 'express';
import * as dbService from '../services/dbService.js';
import { BaseResponse, ValidateApiKeyResponse } from '@agent-base/types';
import { ErrorResponse } from '@agent-base/types';
const router = Router();

/**
 * Validate an API key
 * POST /keys/validate
 * Handles validation by calling the database service
 */
router.post('/validate', async (req, res) => {
  try {
    const { apiKey } = req.body;
    const userId = req.headers['x-user-id'] as string;

    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'API key is required' 
      } as ErrorResponse);
    }

    // Call dbService to validate the API key
    const result = await dbService.validateApiKey(apiKey, userId);
    
    if (!result.success) {
      return res.status(401).json({ 
        success: false, 
        error: result.error || 'Invalid or revoked API key' 
      } as ErrorResponse);
    }

    return res.status(200).json({
      success: true,
      data: {
        userId: result.data.user_id,
        keyId: result.data.key_id
      } as ValidateApiKeyResponse
    });
  } catch (error) {
    console.error('Error during API key validation process:', error instanceof Error ? error.message : error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during key validation'
    });
  }
});

export default router; 