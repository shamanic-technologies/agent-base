/**
 * API Logs routes
 */
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ApiLogEntry } from '../types';
import { DatabaseService } from '../services/database';

const router = Router();
let db: DatabaseService;

function initDatabase() {
  if (!db) {
    db = new DatabaseService();
  }
  return db;
}

/**
 * POST /api-logs/me
 * Log a raw request from the API Gateway
 */
router.post('/me', async (req: Request, res: Response): Promise<void> => {
  try {
    // Initialize database service
    const database = initDatabase();

    // Validate required headers
    const userId = req.headers['x-user-id'];
    const apiKey = req.headers['x-api-key'];

    if (!userId) {
      throw new Error('x-user-id header is required');
    }
    if (!apiKey) {
      throw new Error('x-api-key header is required');
    }

    // Extract relevant information from the raw request
    const logEntry: ApiLogEntry = {
      id: uuidv4(),  // Generate a unique ID using UUID v4
      user_id: userId as string,
      api_key: apiKey as string,
      endpoint: req.path,
      method: req.method,
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
      request_id: req.headers['x-request-id'] as string,
      request_body: req.body,
      conversation_id: req.body?.conversation_id,
      timestamp: new Date().toISOString()
    };

    // Store the log entry
    const result = await database.createLog(logEntry);

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error creating log:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create log entry'
    });
  }
});

/**
 * Get logs for the current user
 * Uses x-user-id header for filtering
 */
router.get('/me', async (req: Request, res: Response): Promise<void> => {
  try {
    // Initialize database service
    const database = initDatabase();

    // Validate required headers
    const userId = req.headers['x-user-id'];
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'x-user-id header is required'
      });
      return;
    }
    
    const { limit, offset } = req.query;
    
    // Validate pagination parameters
    const limitNum = limit ? parseInt(limit as string) : 100;
    const offsetNum = offset ? parseInt(offset as string) : 0;
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
      res.status(400).json({
        success: false,
        error: 'Invalid limit parameter. Must be between 1 and 1000.'
      });
      return;
    }
    
    if (isNaN(offsetNum) || offsetNum < 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid offset parameter. Must be a non-negative number.'
      });
      return;
    }
    
    // Get logs for the user
    const result = await database.getLogs(
      { user_id: userId as string },
      limitNum,
      offsetNum
    );
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch logs'
    });
  }
});

export default router; 