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
router.post('/', async (req, res): Promise<void> => {
  try {
    // Extract API key from the request headers
    const platformApiKey = req.headers['x-platform-api-key'];
    const platformOrgId = req.headers['x-platform-org-id'] as string;
    // Validate the key structure/presence
    if (!platformApiKey || typeof platformApiKey !== 'string') {
      console.error('API key is required in the request body');
      res.status(400).json({ 
        success: false, 
        error: 'API key is required in the request body'
      } as ErrorResponse);
      return;
    }
    if (!platformOrgId) {
      console.error('Authentication required: x-platform-org-id header missing');
      res.status(401).json({ success: false, error: 'Authentication required (x-platform-org-id header missing)' });
      return;
    }
    // Call dbService to validate the API key against the database
    // dbService.validateApiKey now handles the interaction with the database service
    // and expects the database service to return the ApiKey object (including platformUserId) on success.
    const validateResponse : ServiceResponse<ApiKey> = await dbService.validateApiKey(platformApiKey); // Pass only the apiKey
    
    // If validation failed (invalid key, db error, etc.)
    if (!validateResponse.success) {
      // Use 401 for authentication failures (invalid/unknown key)
      // Use 500 for internal errors during validation
      console.error('API key validation failed:', validateResponse.error);
      const statusCode = validateResponse.error?.includes('Internal') ? 500 : 401;
      res.status(statusCode).json(validateResponse);
      return;
    }

    // Validation successful, return the ApiKey object received from dbService
    // This object should contain the platformUserId associated with the key.
    res.status(200).json(validateResponse); // Contains { success: true, data: ApiKey } 
    return;
  } catch (error) {
    console.error('Error during API key validation process:', error instanceof Error ? error.message : error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during key validation'
    });
    return;
  }
});

export default router; 