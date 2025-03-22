/**
 * Route handlers for the logging service
 */
import { Router, Request, Response } from 'express';
import pino from 'pino';
import { ApiLogEntry } from '../types';
import { logApiCall, getUserLogs, getAllLogs } from '../services/database';
import { debitUsage } from '../services/payment';
import { calculatePrice } from '../utils';

// Get the logger instance
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
  },
});

// Create router
const router = Router();

/**
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'healthy',
    service: 'logging-service'
  });
});

/**
 * Log API call
 */
router.post('/log', async (req: Request, res: Response) => {
  try {
    const logEntry = req.body as ApiLogEntry;
    
    // Validate required fields
    if (!logEntry.apiKey || !logEntry.userId || !logEntry.endpoint || !logEntry.method) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: apiKey, userId, endpoint, method'
      });
    }
    
    // Add client IP and user agent if not provided
    if (!logEntry.ipAddress) {
      logEntry.ipAddress = req.ip;
    }
    
    if (!logEntry.userAgent && req.headers['user-agent']) {
      logEntry.userAgent = req.headers['user-agent'];
    }
    
    // Log the API call first
    const logId = await logApiCall(logEntry);
    
    if (!logId) {
      return res.status(500).json({
        success: false,
        error: 'Failed to log API call'
      });
    }
    
    // Debit the usage cost from the user's account if price is set
    const price = logEntry.price || calculatePrice(logEntry);
    
    if (price > 0) {
      // Generate a useful description
      const description = `API usage: ${logEntry.method} ${logEntry.endpoint}`;
      
      // Attempt to debit usage asynchronously - don't wait for result
      // This prevents payment service issues from blocking the logging API
      debitUsage(logEntry.userId, price, description)
        .then(result => {
          if (!result.success) {
            logger.warn(`Failed to debit usage for log ${logId}: ${result.error}`);
          }
        })
        .catch(error => {
          logger.error(`Exception in debit usage for log ${logId}:`, error);
        });
    }
    
    res.status(201).json({
      success: true,
      data: { id: logId }
    });
  } catch (error) {
    logger.error('Error in /log endpoint', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Get logs for a user
 */
router.get('/logs/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const logs = await getUserLogs(userId, limit, offset);
    
    if (logs === null) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get logs'
      });
    }
    
    res.status(200).json({
      success: true,
      data: logs
    });
  } catch (error) {
    logger.error('Error in /logs/user endpoint', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Get all logs with pagination
 */
router.get('/logs/all', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string || '100');
    const offset = parseInt(req.query.offset as string || '0');
    
    const logs = await getAllLogs(limit, offset);
    
    if (logs === null) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get logs'
      });
    }
    
    res.status(200).json({
      success: true,
      data: logs
    });
  } catch (error) {
    logger.error('Error in /logs/all endpoint', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Metrics endpoint (for monitoring)
 */
router.get('/metrics', async (req: Request, res: Response) => {
  // Simple metrics for now, could be expanded with Prometheus or similar
  res.status(200).json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    date: new Date().toISOString()
  });
});

export default router; 