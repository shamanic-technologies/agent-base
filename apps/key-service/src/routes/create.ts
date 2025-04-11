// /**
//  * Route handler for creating API keys
//  */
// import { Router } from 'express';
// import { ApiKeyCreateResponse } from '@agent-base/agents';
// import * as dbService from '../services/dbService.js';

// const router = Router();

// /**
//  * Create a new API key
//  * POST /keys
//  * Generates key, stores secret, saves metadata
//  */
// router.post('/', async (req, res) => {
//   try {
//     const { name } = req.body;
//     const userId = req.headers['x-user-id'] as string;

//     // Validate request
//     if (!userId) {
//       return res.status(401).json({ success: false, error: 'Authentication required (x-user-id header missing)' });
//     }
//     if (!name) {
//       return res.status(400).json({ success: false, error: 'Key name is required' });
//     }

//     // Create key using service
//     const result = await dbService.createApiKey(name, userId);
    
//     if (!result) {
//       throw new Error('Failed to create API key');
//     }

//     // Return success
//     return res.status(201).json({ success: true, data: result });
//   } catch (error) {
//     console.error('Error creating API key:', error instanceof Error ? error.message : error);
//     return res.status(500).json({ success: false, error: 'Internal server error while creating API key' });
//   }
// });

// export default router; 