/**
 * User Credentials Routes
 * 
 * API endpoints for managing user credentials
 */
import express, { RequestHandler } from 'express';
import { createOrUpdateOAuth, getCredentials as getOAuthCredentials } from '../services/oauth.js';
import { CreateOrUpdateOAuthInput, GetUserOAuthInput, OAuthProvider } from '@agent-base/types';
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
  const getCredentialsInput = req.query as unknown as GetUserOAuthInput;
  try {
    const internalCredentialsResponse = await getInternalAuthHeaders(req);

    if (!internalCredentialsResponse.success) {
      return res.status(401).json({ success: false, error: internalCredentialsResponse.error });
    }

    const internalCredentials = internalCredentialsResponse.data;
    const getResponse = await getOAuthCredentials(getCredentialsInput, internalCredentials);
    
    if (getResponse.success) {
      res.status(200).json(getResponse);
    } else {
      console.error('Error in get credentials route:', getResponse.error);
      res.status(500).json(getResponse);
    }
  } catch (error) {
    console.error('Error in get credentials route:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}) as RequestHandler);

export default router; 