/**
 * User Credentials Routes
 * 
 * API endpoints for managing user credentials
 */
import express, { RequestHandler } from 'express';
import { createOrUpdateCredentials, getCredentials } from '../services/credentials.js';
import { CreateOrUpdateCredentialsInput, GetUserCredentialsInput } from '@agent-base/types';

const router = express.Router();

/**
 * Create new user credentials
 */
router.post('/', (async (req, res) => {
  try {
    const input: CreateOrUpdateCredentialsInput = req.body;
    
    // Validate required fields
    if (!input.userId || !input.oauthProvider || !input.accessToken || !input.refreshToken || !input.expiresAt || !input.scopes) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
      return;
    }

    const result = await createOrUpdateCredentials(input);
    
    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.status(201).json(result);
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
    const input: GetUserCredentialsInput = req.query as unknown as GetUserCredentialsInput; 
    
    if (!input.userId || !input.oauthProvider || !input.requiredScopes) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
      return;
    }

    const result = await getCredentials(input);
    
    if (!result.success) {
      res.status(500).json(result);
      return;
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in get credentials route:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}) as RequestHandler);

// /**
//  * Update user credentials
//  */
// router.patch('/:userId', (async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const input: UpdateCredentialsInput = req.body;
    
//     if (!userId) {
//       res.status(400).json({
//         success: false,
//         error: 'User ID is required'
//       });
//       return;
//     }

//     if (!input.accessToken || !input.expiresAt) {
//       res.status(400).json({
//         success: false,
//         error: 'Access token and expiration time are required'
//       });
//       return;
//     }

//     const result = await updateCredentials(userId, input);
    
//     if (!result.success) {
//       res.status(404).json(result);
//       return;
//     }

//     res.status(200).json(result);
//   } catch (error) {
//     console.error('Error in update credentials route:', error);
//     res.status(500).json({
//       success: false,
//       error: error instanceof Error ? error.message : 'Unknown error occurred'
//     });
//   }
// }) as RequestHandler);

export default router; 