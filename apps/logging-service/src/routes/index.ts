/**
 * Route handlers for the logging service
 */
import { Router, Request, Response } from 'express';
import pino from 'pino';
import { ApiLogEntry } from '../types/index.js';
import { logApiCall, getUserLogs, getAllLogs } from '../services/database.js';
import { debitUsage } from '../services/payment.js';
import { calculatePrice } from '../utils/index.js';

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
 * This endpoint can be called directly from the API Gateway service
 * or forwarded by other services using the X-API-KEY header
 */
router.post('/log', async (req: Request, res: Response) => {
  try {
    const logEntry = req.body as ApiLogEntry;
    const serviceApiKey = req.headers['x-api-key'] as string;
    const userId = req.headers['x-user-id'] as string;
    
    // If X-API-KEY header is provided, use it for logging (preferred approach)
    if (serviceApiKey) {
      logEntry.apiKey = serviceApiKey;
      logger.info('Using X-API-KEY header for API call logging');
    }
    
    // If X-USER-ID header is provided, use it (preferred approach)
    if (userId) {
      logEntry.userId = userId;
      logger.info('Using X-USER-ID header for user identification');
    }
    
    // Validate required fields
    if (!logEntry.apiKey) {
      logger.error('Missing apiKey in log entry and no X-API-KEY header provided');
      return res.status(400).json({
        success: false,
        error: 'Missing required field: apiKey. Please provide X-API-KEY header.'
      });
    }
    
    if (!logEntry.userId && !userId) {
      logger.error('Missing userId in log entry and no X-USER-ID header provided');
      return res.status(400).json({
        success: false,
        error: 'Missing required field: userId. Please provide X-USER-ID header.'
      });
    }
    
    if (!logEntry.endpoint || !logEntry.method) {
      const missingFields = [];
      if (!logEntry.endpoint) missingFields.push('endpoint');
      if (!logEntry.method) missingFields.push('method');
      
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
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
 * Get logs for a user (authenticated via headers)
 * Uses the user ID from x-user-id header that is set by the API Gateway auth middleware
 */
router.get('/logs/user', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!userId) {
      logger.warn('Missing x-user-id header in request to /logs/user');
      return res.status(401).json({
        success: false,
        error: 'Authentication required - missing x-user-id header'
      });
    }
    
    if (!apiKey) {
      logger.warn('Missing x-api-key header in request to /logs/user');
      return res.status(401).json({
        success: false,
        error: 'Authentication required - missing x-api-key header'
      });
    }
    
    logger.info(`Getting logs for user ${userId} authenticated via X-API-KEY`);
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
 * Requires admin privileges via X-API-KEY
 */
router.get('/logs/all', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!userId || !apiKey) {
      logger.warn('Missing authentication headers in request to /logs/all');
      return res.status(401).json({
        success: false,
        error: 'Authentication required - X-API-KEY and X-USER-ID headers must be provided'
      });
    }
    
    // This endpoint should only be accessible to admin users
    // In a production scenario, you would check user roles here
    logger.info(`Admin user ${userId} accessing all logs`);
    
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
 * Requires authentication via X-API-KEY
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    
    // Log the user accessing metrics
    if (userId) {
      logger.info(`User ${userId} accessing metrics endpoint`);
    }
    
    // Return metrics data
    res.status(200).json({
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      date: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error in /metrics endpoint', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router; 