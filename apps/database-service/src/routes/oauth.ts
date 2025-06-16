/**
 * User Credentials Routes
 * 
 * API endpoints for managing user credentials
 */
import express, { RequestHandler } from 'express';
import { createOrUpdateOAuth, getCredentials as getOAuthCredentials } from '../services/oauth.js';
import { CreateOrUpdateOAuthInput, GetUserOAuthInput, OAuthProvider } from '@agent-base/types';
// @ts-ignore api-client will be recognized soon
import { getInternalAuthHeaders } from '@agent-base/api-client';


const router = express.Router();

/**
 * Create new user credentials
 */
router.post('/', (async (req, res) => {
  try {
    const input: CreateOrUpdateOAuthInput = req.body;
    const internalCredentials = getInternalAuthHeaders(req as any);
    
    // Validate required fields
    if (!input.oauthProvider || !input.accessToken || !input.refreshToken || !input.expiresAt || !input.scopes) {
      console.error('Missing required fields:', input);
      res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
      return;
    }

    const createOrUpdateResponse = await createOrUpdateOAuth(input, internalCredentials);
    
    if (!createOrUpdateResponse.success) {
      console.error('Error in create credentials route:', createOrUpdateResponse.error);
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
  const internalCredentials = getInternalAuthHeaders(req as any);
  try {
    // Read input from query parameters for GET requests, adhering to REST standards
    const input = req.query;
    const clientUserId = input.clientUserId as string;
    const clientOrganizationId = input.clientOrganizationId as string;
    const oauthProvider = input.oauthProvider as OAuthProvider;
    // Handle both array and comma-separated string for requiredScopes
    const scopesQueryParam = input.requiredScopes;
    let requiredScopes: string[] = [];
    if (typeof scopesQueryParam === 'string') {
        requiredScopes = scopesQueryParam.split(',');
    } else if (Array.isArray(scopesQueryParam)) {
        // This handles cases where query-string parsers might produce an array
        requiredScopes = scopesQueryParam as string[];
    }

    const getCredentialsInput: GetUserOAuthInput = {
      clientUserId,
      clientOrganizationId,
      oauthProvider,
      requiredScopes
    };
    
    if (!input.clientUserId || !input.clientOrganizationId || !input.oauthProvider || !input.requiredScopes) {
      console.error('Missing required fields:', input);
      res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
      return;
    }

    const getResponse = await getOAuthCredentials(getCredentialsInput, internalCredentials);
    
    if (!getResponse.success) {
      console.error('Error in get credentials route:', getResponse.error);
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