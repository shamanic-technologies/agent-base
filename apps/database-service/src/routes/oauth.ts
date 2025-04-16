/**
 * User Credentials Routes
 * 
 * API endpoints for managing user credentials
 */
import express, { RequestHandler } from 'express';
import { createOrUpdateOAuth, getCredentials as getOAuthCredentials } from '../services/oauth.js';
import { CreateOrUpdateOAuthInput, GetUserOAuthInput, OAuthProvider } from '@agent-base/types';

const router = express.Router();

/**
 * Create new user credentials
 */
router.post('/', (async (req, res) => {
  try {
    const input: CreateOrUpdateOAuthInput = req.body;
    
    // Validate required fields
    if (!input.userId || !input.oauthProvider || !input.accessToken || !input.refreshToken || !input.expiresAt || !input.scopes) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
      return;
    }

    const createOrUpdateResponse = await createOrUpdateOAuth(input);
    
    if (!createOrUpdateResponse.success) {
      res.status(400).json(createOrUpdateResponse);
      return;
    }

    res.status(201).json(createOrUpdateResponse);
  } catch (error) {
    console.error('Error in create credentials route:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}) as RequestHandler);

/**
 * Get user credentials by user ID
 */
router.get('/', (async (req, res) => {
  try {
    // Read input from query parameters for GET requests, adhering to REST standards
    const input = req.query;
    const userId = input.userId as string;
    const oauthProvider = input.oauthProvider as OAuthProvider;
    const requiredScopes = input.requiredScopes as string[];

    const getCredentialsInput: GetUserOAuthInput = {
      userId,
      oauthProvider,
      requiredScopes
    };
    
    if (!input.userId || !input.oauthProvider || !input.requiredScopes) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
      return;
    }

    const getResponse = await getOAuthCredentials(getCredentialsInput);
    
    if (!getResponse.success) {
      res.status(500).json(getResponse);
      return;
    }

    res.status(200).json(getResponse);
  } catch (error) {
    console.error('Error in get credentials route:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}) as RequestHandler);

export default router; 