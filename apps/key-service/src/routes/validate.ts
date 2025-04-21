/**
 * Route handler for validating API keys
 */
import { Router } from 'express';
import * as dbService from '../services/dbService.js';
import { ApiKey, BaseResponse, ServiceResponse, ValidateApiKeyResponse } from '@agent-base/types';
import { ErrorResponse } from '@agent-base/types';
const router = Router();

/**
 * Validate an API key
 * POST /validate
 * Handles validation by calling the database service
 */
router.post('/', async (req, res) => {
  try {
    // Extract API key from the request headers
    const platformApiKey = req.headers['x-platform-api-key'];

    // Validate the key structure/presence
    if (!platformApiKey || typeof platformApiKey !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'API key is required in the request body'
      } as ErrorResponse);
    }

    // Call dbService to validate the API key against the database
    // dbService.validateApiKey now handles the interaction with the database service
    // and expects the database service to return the ApiKey object (including platformUserId) on success.
    const validateResponse : ServiceResponse<ApiKey> = await dbService.validateApiKey(platformApiKey); // Pass only the apiKey
    
    // If validation failed (invalid key, db error, etc.)
    if (!validateResponse.success) {
      // Use 401 for authentication failures (invalid/unknown key)
      // Use 500 for internal errors during validation
      const statusCode = validateResponse.error?.includes('Internal') ? 500 : 401;
      return res.status(statusCode).json(validateResponse);
    }

    // Validation successful, return the ApiKey object received from dbService
    // This object should contain the platformUserId associated with the key.
    return res.status(200).json(validateResponse); // Contains { success: true, data: ApiKey } 
  } catch (error) {
    console.error('Error during API key validation process:', error instanceof Error ? error.message : error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during key validation'
    });
  }
});

export default router; 