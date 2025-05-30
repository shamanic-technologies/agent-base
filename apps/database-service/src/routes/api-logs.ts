// /**
//  * API Logs routes
//  */
// import { Router, Request, Response } from 'express';
// import { pgPool } from '../db.js';
// import { v4 as uuidv4 } from 'uuid';

// const router = Router();

// /**
//  * Get logs for the current user
//  * Uses x-user-id header for filtering
//  */
// router.get('/me', async (req: Request, res: Response): Promise<void> => {
//   try {
//     const userId = req.headers['x-user-id'];
    
//     if (!userId) {
//       res.status(401).json({
//         success: false,
//         error: 'x-user-id header is required'
//       });
//       return;
//     }
    
//     const { limit, offset } = req.query;
    
//     // Validate pagination parameters
//     const limitNum = limit ? parseInt(limit as string) : 100;
//     const offsetNum = offset ? parseInt(offset as string) : 0;
    
//     if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
//       res.status(400).json({
//         success: false,
//         error: 'Invalid limit parameter. Must be between 1 and 1000.'
//       });
//       return;
//     }
    
//     if (isNaN(offsetNum) || offsetNum < 0) {
//       res.status(400).json({
//         success: false,
//         error: 'Invalid offset parameter. Must be a non-negative number.'
//       });
//       return;
//     }
    
//     // Build query to search in JSONB data field
//     const query = `
//       SELECT * FROM "api_logs"
//       WHERE data->>'user_id' = $1
//       ORDER BY created_at DESC
//       LIMIT $2 OFFSET $3
//     `;
    
//     // Count total matching records
//     const countQuery = `
//       SELECT COUNT(*) FROM "api_logs"
//       WHERE data->>'user_id' = $1
//     `;
    
//     const [result, countResult] = await Promise.all([
//       pgPool.query(query, [userId, limitNum, offsetNum]),
//       pgPool.query(countQuery, [userId])
//     ]);
    
//     const total = parseInt(countResult.rows[0].count);
    
//     res.status(200).json({
//       success: true,
//       data: {
//         items: result.rows || [],
//         total: total || 0,
//         limit: limitNum,
//         offset: offsetNum
//       }
//     });
//   } catch (error: any) {
//     console.error('Error fetching user API logs:', error);
//     res.status(500).json({ success: false, error: 'Internal server error' });
//   }
// });

// /**
//  * Create a new log entry for the current user
//  * Uses x-user-id header to associate log with user
//  */
// router.post('/me', async (req: Request, res: Response): Promise<void> => {
//   try {
//     const userId = req.headers['x-user-id'];
    
//     if (!userId) {
//       res.status(401).json({
//         success: false,
//         error: 'x-user-id header is required'
//       });
//       return;
//     }
    
//     if (!req.body) {
//       res.status(400).json({
//         success: false,
//         error: 'Request body is required'
//       });
//       return;
//     }
    
//     // Create log entry with user ID included in data
//     const logData = { ...req.body, user_id: userId };
    
//     // Create database record
//     const logEntry = {
//       id: uuidv4(),
//       data: logData,
//       created_at: new Date().toISOString(),
//       updated_at: new Date().toISOString()
//     };
    
//     // Insert into database
//     const query = `
//       INSERT INTO "api_logs" (id, data, created_at, updated_at)
//       VALUES ($1, $2, $3, $4)
//       RETURNING *
//     `;
    
//     const result = await pgPool.query(query, [
//       logEntry.id,
//       logEntry.data,
//       logEntry.created_at,
//       logEntry.updated_at
//     ]);
    
//     res.status(201).json({
//       success: true,
//       data: result.rows[0]
//     });
//   } catch (error: any) {
//     console.error('Error creating API log:', error);
//     res.status(500).json({ success: false, error: 'Internal server error' });
//   }
// });

// export default router; 