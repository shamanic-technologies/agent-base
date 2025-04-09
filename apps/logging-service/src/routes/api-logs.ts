/**
 * API Logs routes
 */
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
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
    const userId = (req as any).headers['x-user-id'];
    const apiKey = (req as any).headers['x-api-key'];

    if (!userId) {
      throw new Error('x-user-id header is required');
    }
    if (!apiKey) {
      throw new Error('x-api-key header is required');
    }

    // Extract relevant information from the raw request
    const logEntry: any = {
      id: uuidv4(),  // Generate a unique ID using UUID v4
      user_id: userId as string,
      api_key: apiKey as string,
      endpoint: (req as any).path,
      method: (req as any).method,
      ip_address: (req as any).ip,
      user_agent: (req as any).get('user-agent'),
      request_id: (req as any).headers['x-request-id'] as string,
      request_body: (req as any).body,
      conversation_id: (req as any).body?.conversation_id,
      timestamp: new Date().toISOString()
    };

    // Store the log entry
    const result = await database.createLog(logEntry);

    (res as any).status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error creating log:', error);
    (res as any).status(400).json({
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
    const userId = (req as any).headers['x-user-id'];
    if (!userId) {
      (res as any).status(401).json({
        success: false,
        error: 'x-user-id header is required'
      });
      return;
    }
    
    const { limit, offset } = (req as any).query;
    
    // Validate pagination parameters
    const limitNum = limit ? parseInt(limit as string) : 100;
    const offsetNum = offset ? parseInt(offset as string) : 0;
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
      (res as any).status(400).json({
        success: false,
        error: 'Invalid limit parameter. Must be between 1 and 1000.'
      });
      return;
    }
    
    if (isNaN(offsetNum) || offsetNum < 0) {
      (res as any).status(400).json({
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
    
    (res as any).status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    (res as any).status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch logs'
    });
  }
});

export default router; 