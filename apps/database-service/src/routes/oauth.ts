/**
 * User Credentials Routes
 * 
 * API endpoints for managing user credentials
 */
import express, { RequestHandler } from 'express';
import { createOrUpdateOAuth, getCredentials } from '../services/oauth.js';
import { CreateOrUpdateOAuthInput, GetUserOAuthInput, OAuth, OAuthProvider, ServiceResponse } from '@agent-base/types';
import { getInternalAuthHeaders } from '@agent-base/api-client';


const router = express.Router();

/**
 * Create new user credentials
 */
router.post('/', (async (req, res) => {
  try {
    const input: CreateOrUpdateOAuthInput = req.body;
    const internalCredentialsResponse = await getInternalAuthHeaders(req);

    if (!internalCredentialsResponse.success) {
      return res.status(401).json({ success: false, error: internalCredentialsResponse.error });
    }

    const internalCredentials = internalCredentialsResponse.data;
    const createOrUpdateResponse = await createOrUpdateOAuth(input, internalCredentials);
    
    if (createOrUpdateResponse.success) {
      res.status(201).json(createOrUpdateResponse);
    } else {
      console.error('Error in create credentials route:', createOrUpdateResponse.error);
      res.status(400).json(createOrUpdateResponse);
    }
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
    const { oauthProvider } = req.query;
    const requiredScopesRaw = req.query.requiredScopes as string | undefined;

    const internalCredentialsResponse = await getInternalAuthHeaders(req);

    if (!internalCredentialsResponse.success) {
      console.error('[DB Route /oauth] Error in get credentials route:', internalCredentialsResponse.error);
      return res.status(401).json({ success: false, error: internalCredentialsResponse.error });
    }

    const internalCredentials = internalCredentialsResponse.data;

    const getCredentialsInput: GetUserOAuthInput = {
      clientUserId: internalCredentials.clientUserId,
      clientOrganizationId: internalCredentials.clientOrganizationId,
      oauthProvider: oauthProvider as OAuthProvider,
      requiredScopes: requiredScopesRaw ? requiredScopesRaw.split(',') : []
    };

    const getResponse: ServiceResponse<OAuth[]> = await getCredentials(getCredentialsInput, internalCredentials);
    
    if (getResponse.success) {
      res.status(200).json(getResponse);
    } else {
      console.error('[DB Route /oauth] Error in get credentials route:', getResponse.error);
      res.status(500).json(getResponse);
    }
  } catch (error) {
    console.error('[DB Route /oauth] Error in get credentials route:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}) as RequestHandler);

export default router; 